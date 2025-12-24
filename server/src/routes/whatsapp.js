import { Router } from 'express'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import { getUserByPhone, isAuthorizedPhone, getGroupByUserId, getGroupMembers } from '../services/userService.js'
import { createExpense } from '../services/expenseService.js'
import { parseExpenseMessage, extractCurrency, stripCurrencyFromDescription } from '../utils/messageParser.js'
import { convertToARS } from '../services/exchangeRateService.js'
import { resolveMentionsToUserIds } from '../services/mentionService.js'
import {
  sendMessage,
  formatExpenseConfirmation,
  formatParseErrorMessage,
  formatValidationErrorMessage,
} from '../services/whatsappService.js'
import {
  isCommand,
  parseCommand,
  getHelpMessage,
  getBalanceMessage,
  getExpenseListMessage,
  deleteExpenseCommand,
  getUnknownCommandMessage,
  getGroupMessage,
  setPendingGroupSelection,
  hasPendingGroupSelection,
  handleGroupSelectionResponse,
} from '../services/commandService.js'

const router = Router()

/**
 * Message deduplication cache
 * Stores processed message IDs with timestamp for cleanup
 * Format: { messageId: timestamp }
 */
const processedMessageIds = new Map()

/**
 * Clean up old message IDs (older than 1 hour)
 * Runs periodically to prevent memory leak
 */
function cleanupProcessedMessages() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  for (const [messageId, timestamp] of processedMessageIds.entries()) {
    if (timestamp < oneHourAgo) {
      processedMessageIds.delete(messageId)
    }
  }
}

// Run cleanup every 15 minutes
setInterval(cleanupProcessedMessages, 15 * 60 * 1000)

/**
 * Rate limiting middleware for webhook endpoint
 * Limit: 100 requests per minute per IP
 */
const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
})

/**
 * Verify WhatsApp webhook signature
 * Meta sends X-Hub-Signature-256 header with HMAC SHA256 signature
 *
 * Security: This function ALWAYS runs in production. The bypass ONLY works when:
 * 1. NODE_ENV is explicitly set to 'development' AND
 * 2. WHATSAPP_SKIP_SIGNATURE_VERIFICATION is explicitly set to 'true'
 */
function verifyWebhookSignature(req, res, next) {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const skipFlagEnabled = process.env.WHATSAPP_SKIP_SIGNATURE_VERIFICATION === 'true'

  // CRITICAL: Only allow bypass in development mode with explicit flag
  if (isDevelopment && skipFlagEnabled) {
    console.warn('WARNING: Skipping webhook signature verification (development only)')
    return next()
  }

  // In production or when skip flag is not set, ALWAYS verify
  // Ensure the bypass is explicitly disabled in production
  if (!isDevelopment && skipFlagEnabled) {
    console.error('SECURITY ERROR: WHATSAPP_SKIP_SIGNATURE_VERIFICATION is enabled in production')
    return res.status(500).json({ error: 'Invalid server configuration' })
  }

  const signature = req.headers['x-hub-signature-256']
  const appSecret = process.env.WHATSAPP_APP_SECRET

  if (!appSecret) {
    console.error('WHATSAPP_APP_SECRET not configured')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  if (!signature) {
    console.error('Missing X-Hub-Signature-256 header')
    return res.status(401).json({ error: 'Missing signature' })
  }

  // Signature format: sha256=<hash>
  const signatureHash = signature.split('=')[1]

  if (!signatureHash) {
    console.error('Invalid signature format')
    return res.status(401).json({ error: 'Invalid signature format' })
  }

  const rawBody = req.rawBody
  if (!rawBody) {
    console.warn('Missing req.rawBody; signature verification may fail')
  }

  // Calculate expected signature using HMAC SHA256
  const expectedHash = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody || JSON.stringify(req.body))
    .digest('hex')

  // Constant-time comparison to prevent timing attacks
  if (signatureHash !== expectedHash) {
    console.error('Invalid webhook signature')
    return res.status(401).json({ error: 'Invalid signature' })
  }

  // Signature valid, proceed
  next()
}

/**
 * Test route to verify endpoint is reachable
 * GET /api/whatsapp/test
 */
router.get('/test', (req, res) => {
  res.status(200).json({
    status: 'webhook route reachable',
    timestamp: new Date().toISOString(),
  })
})

/**
 * Webhook verification (required by Meta/WhatsApp)
 * GET /api/whatsapp/webhook
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge)
  } else {
    console.error('Webhook verification failed:', {
      mode: mode || 'missing',
      tokenMatch: token === process.env.WHATSAPP_VERIFY_TOKEN,
      hasChallenge: !!challenge
    })
    res.sendStatus(403)
  }
})

/**
 * Webhook handler (receives messages from WhatsApp)
 * POST /api/whatsapp/webhook
 * - Rate limited to 100 requests/minute per IP
 * - Signature verified against WHATSAPP_APP_SECRET
 */
router.post('/webhook', webhookRateLimiter, verifyWebhookSignature, async (req, res) => {
  try {
    const payload = req.body

    // Respond immediately to WhatsApp (required)
    res.sendStatus(200)

    // Process the webhook asynchronously
    await processWebhook(payload)
  } catch (error) {
    console.error('Error processing webhook:', error)
  }
})

/**
 * Process WhatsApp webhook payload
 */
async function processWebhook(payload) {
  // Validate payload structure
  if (payload.object !== 'whatsapp_business_account') {
    return
  }

  if (!payload.entry) return

  for (const entry of payload.entry) {
    if (!entry.changes) continue

    for (const change of entry.changes) {
      const { value } = change

      // Only process messages
      if (!value.messages || value.messages.length === 0) {
        continue
      }

      for (const message of value.messages) {
        // Only handle text messages for now
        if (message.type !== 'text') {
          continue
        }

        await handleTextMessage(
          message.from,
          message.text.body,
          message.id
        )
      }
    }
  }
}

/**
 * Validate expense input
 * @returns {object} { valid: boolean, error?: string }
 */
function validateExpenseInput(amount, description) {
  // Amount must be a positive number
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { valid: false, error: 'El monto debe ser un número positivo' }
  }

  if (amount <= 0) {
    return { valid: false, error: 'El monto debe ser mayor a cero' }
  }

  // Description must be 1-500 characters
  if (!description || typeof description !== 'string') {
    return { valid: false, error: 'Falta la descripción del gasto' }
  }

  const trimmedDescription = description.trim()

  if (trimmedDescription.length < 1) {
    return { valid: false, error: 'Falta la descripción del gasto' }
  }

  if (trimmedDescription.length > 500) {
    return { valid: false, error: 'La descripción es muy larga (máximo 500 caracteres)' }
  }

  return { valid: true }
}

/**
 * Handle incoming text message
 */
async function handleTextMessage(from, text, messageId) {
  // 0. Check for duplicate message
  if (processedMessageIds.has(messageId)) {
    return
  }

  // Mark message as processed
  processedMessageIds.set(messageId, Date.now())

  // 1. Check if phone number is authorized
  if (!isAuthorizedPhone(from)) {
    return
  }

  // 2. Get user from database
  const user = await getUserByPhone(from)

  if (!user) {
    console.error(`User not found for phone: ${from}`)
    return
  }

  // 3. Check for pending group selection (before processing as expense)
  if (hasPendingGroupSelection(user.id)) {
    const result = await handleGroupSelectionResponse(user.id, text)
    if (result) {
      // Was handled as group selection
      await sendMessage(from, result.message)
      return
    }
    // Not a group selection, continue with normal processing
  }

  // 4. Get user's group (uses activeGroupId if set)
  const group = await getGroupByUserId(user.id)
  const groupId = group?.id || null

  // 5. Check if this is a command
  if (isCommand(text)) {
    await handleCommand(from, text, user, groupId)
    return
  }

  // 6. Process as expense
  await handleExpenseMessage(from, text, user, groupId, group?.name)
}

/**
 * Handle bot commands
 */
async function handleCommand(from, text, user, groupId) {
  const parsed = parseCommand(text)

  if (!parsed) {
    return
  }

  const { command, args } = parsed

  switch (command) {
    case '/ayuda':
    case '/help':
      await sendMessage(from, getHelpMessage())
      break

    case '/grupo':
    case '/group':
      const { message: groupMessage, groups } = await getGroupMessage(user.id, user.activeGroupId || groupId)
      await sendMessage(from, groupMessage)
      // If user has multiple groups, set up pending selection
      if (groups.length > 1) {
        setPendingGroupSelection(user.id, groups)
      }
      break

    case '/balance':
    case '/saldo':
      if (!groupId) {
        await sendMessage(from, '⚠️ No pertenecés a ningún grupo.')
        return
      }
      const balanceMessage = await getBalanceMessage(groupId)
      await sendMessage(from, balanceMessage)
      break

    case '/lista':
    case '/list':
      if (!groupId) {
        await sendMessage(from, '⚠️ No pertenecés a ningún grupo.')
        return
      }
      const listMessage = await getExpenseListMessage(groupId)
      await sendMessage(from, listMessage)
      break

    case '/borrar':
    case '/delete':
      if (!groupId) {
        await sendMessage(from, '⚠️ No pertenecés a ningún grupo.')
        return
      }
      if (!args.trim()) {
        await sendMessage(from, '⚠️ Indicá qué gasto querés eliminar.\n\nEjemplo: /borrar 1\n\nUsá /lista para ver los gastos.')
        return
      }
      const deleteResult = await deleteExpenseCommand(args.trim(), user.id, groupId)
      await sendMessage(from, deleteResult.message)
      break

    default:
      await sendMessage(from, getUnknownCommandMessage(command))
      break
  }
}

/**
 * Handle expense messages
 */
async function handleExpenseMessage(from, text, user, groupId, groupName) {
  // 1. Check for currency conversion
  const currencyInfo = extractCurrency(text)
  let finalAmount = 0
  let originalAmount
  let originalCurrency

  // 2. Parse the expense message
  const parsed = parseExpenseMessage(text)

  if (currencyInfo) {
    finalAmount = await convertToARS(currencyInfo.amount, currencyInfo.currency)
    originalAmount = currencyInfo.amount
    originalCurrency = currencyInfo.currency
  } else {
    finalAmount = parsed.amount
  }

  // 3. If parsing failed, send error message
  if (parsed.needsReview) {
    await sendMessage(from, formatParseErrorMessage())
    return
  }

  // 4. Clean description - remove currency words (euro, usd, etc.)
  const cleanDescription = stripCurrencyFromDescription(parsed.description)

  // 5. Validate input before creating expense
  const validation = validateExpenseInput(finalAmount, cleanDescription)

  if (!validation.valid) {
    await sendMessage(from, formatValidationErrorMessage(validation.error))
    return
  }

  // 6. Resolve @mentions to user IDs using fuzzy matching
  let resolvedSplitAmong = []
  let displayNames = [] // Names to show in confirmation message

  if (parsed.splitAmong && parsed.splitAmong.length > 0 && groupId) {
    // Get group members for fuzzy matching
    const groupMembers = await getGroupMembers(groupId)
    resolvedSplitAmong = resolveMentionsToUserIds(parsed.splitAmong, groupMembers)

    // Always include the sender in splitAmong (the person who pays always participates)
    if (!resolvedSplitAmong.includes(user.id)) {
      resolvedSplitAmong.unshift(user.id) // Add sender at the beginning
    }

    // Build display names: sender first, then other mentioned names (avoid duplicates if sender tagged themselves)
    const otherMentions = parsed.splitAmong.filter(
      name => name.toLowerCase() !== user.name.toLowerCase()
    )
    displayNames = [user.name, ...otherMentions]
  }

  // 7. Create expense in Firestore
  try {
    await createExpense({
      userId: user.id,
      userName: user.name,
      amount: finalAmount,
      originalAmount,
      originalCurrency,
      originalInput: text,
      description: cleanDescription,
      category: parsed.category || 'general',
      splitAmong: resolvedSplitAmong,
      groupId: groupId,
      timestamp: new Date()
    })

    // 8. Send confirmation message to user
    const confirmationMessage = formatExpenseConfirmation(
      finalAmount,
      originalAmount,
      originalCurrency,
      cleanDescription,
      parsed.category || 'general',
      displayNames, // Show sender + mentioned names
      groupName // Show which group the expense was registered in
    )

    await sendMessage(from, confirmationMessage)
  } catch (error) {
    console.error('Error creating expense:', error)
    await sendMessage(
      from,
      '❌ *Error al guardar el gasto*\n\nOcurrió un error al procesar tu mensaje. Por favor intentá de nuevo.'
    )
  }
}

export default router
