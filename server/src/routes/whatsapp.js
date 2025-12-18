import { Router } from 'express'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import { getUserByPhone, isAuthorizedPhone } from '../services/userService.js'
import { createExpense } from '../services/expenseService.js'
import { parseExpenseMessage, extractCurrency, convertToARS } from '../utils/messageParser.js'
import {
  sendMessage,
  formatExpenseConfirmation,
  formatParseErrorMessage,
  formatValidationErrorMessage,
} from '../services/whatsappService.js'

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
 */
function verifyWebhookSignature(req, res, next) {
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.WHATSAPP_SKIP_SIGNATURE_VERIFICATION === 'true'
  ) {
    console.warn('⚠️ Skipping WhatsApp webhook signature verification (development only)')
    return next()
  }

  const signature = req.headers['x-hub-signature-256']
  const appSecret = process.env.WHATSAPP_APP_SECRET

  if (!appSecret) {
    console.error('❌ WHATSAPP_APP_SECRET not configured')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  if (!signature) {
    console.error('❌ Missing X-Hub-Signature-256 header')
    return res.status(401).json({ error: 'Missing signature' })
  }

  // Signature format: sha256=<hash>
  const signatureHash = signature.split('=')[1]

  const rawBody = req.rawBody
  if (!rawBody) {
    console.warn('⚠️ Missing req.rawBody; signature verification may fail due to JSON re-encoding')
  }

  // Calculate expected signature
  const expectedHash = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody || JSON.stringify(req.body))
    .digest('hex')

  if (signatureHash !== expectedHash) {
    console.error('❌ Invalid webhook signature')
    console.error(`   Received: ${signatureHash?.slice(0, 12)}... Expected: ${expectedHash.slice(0, 12)}...`)
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
  console.log('🧪 Test endpoint hit')
  res.status(200).json({
    status: 'webhook route reachable',
    timestamp: new Date().toISOString(),
    headers: req.headers,
  })
})

/**
 * Webhook verification (required by Meta/WhatsApp)
 * GET /api/whatsapp/webhook
 */
router.get('/webhook', (req, res) => {
  console.log('═══════════════════════════════════════════════════════')
  console.log('📥 GET /api/whatsapp/webhook - Verification Request')
  console.log('═══════════════════════════════════════════════════════')
  console.log('Query Parameters:')
  console.log('  hub.mode:', req.query['hub.mode'] || '(missing)')
  console.log('  hub.verify_token:', req.query['hub.verify_token'] ? '***' + req.query['hub.verify_token'].slice(-4) : '(missing)')
  console.log('  hub.challenge:', req.query['hub.challenge'] || '(missing)')
  console.log('All Query Params:', JSON.stringify(req.query, null, 2))
  console.log('Headers:', JSON.stringify(req.headers, null, 2))
  console.log('Expected verify_token:', process.env.WHATSAPP_VERIFY_TOKEN ? '***' + process.env.WHATSAPP_VERIFY_TOKEN.slice(-4) : '(not configured)')
  console.log('───────────────────────────────────────────────────────')

  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Webhook verification SUCCESSFUL')
    console.log('Responding with challenge:', challenge)
    console.log('═══════════════════════════════════════════════════════\n')
    res.status(200).send(challenge)
  } else {
    console.error('❌ Webhook verification FAILED')
    console.error('Reason:')
    if (mode !== 'subscribe') {
      console.error('  - hub.mode is not "subscribe" (received:', mode, ')')
    }
    if (token !== process.env.WHATSAPP_VERIFY_TOKEN) {
      console.error('  - hub.verify_token does not match')
      console.error('    Received:', token ? '***' + token.slice(-4) : '(missing)')
      console.error('    Expected:', process.env.WHATSAPP_VERIFY_TOKEN ? '***' + process.env.WHATSAPP_VERIFY_TOKEN.slice(-4) : '(not configured)')
    }
    if (!challenge) {
      console.error('  - hub.challenge is missing')
    }
    console.log('═══════════════════════════════════════════════════════\n')
    res.sendStatus(403)
  }
})

/**
 * Webhook handler (receives messages from WhatsApp)
 * POST /api/whatsapp/webhook
 * - Rate limited to 100 requests/minute per IP
 * - Signature verified against WHATSAPP_APP_SECRET
 */
router.post('/webhook', (req, res, next) => {
  // Log BEFORE any middleware runs
  console.log('═══════════════════════════════════════════════════════')
  console.log('📨 POST /api/whatsapp/webhook - Message Received')
  console.log('═══════════════════════════════════════════════════════')
  console.log('Timestamp:', new Date().toISOString())
  console.log('IP:', req.ip || req.connection.remoteAddress)
  console.log('Headers:', JSON.stringify(req.headers, null, 2))
  console.log('Body (first 500 chars):', JSON.stringify(req.body, null, 2).substring(0, 500))
  console.log('Raw Body available:', !!req.rawBody)
  console.log('───────────────────────────────────────────────────────')
  next()
}, webhookRateLimiter, verifyWebhookSignature, async (req, res) => {
  try {
    console.log('✅ POST webhook passed rate limiting and signature verification')
    const payload = req.body

    // Respond immediately to WhatsApp (required)
    res.sendStatus(200)
    console.log('✅ Sent 200 OK response to WhatsApp')
    console.log('═══════════════════════════════════════════════════════\n')

    // Process the webhook asynchronously
    await processWebhook(payload)
  } catch (error) {
    console.error('❌ Error processing webhook:', error)
    console.error('Stack:', error.stack)
    console.log('═══════════════════════════════════════════════════════\n')
    // Don't send status again if already sent, but good practice to log
  }
})

/**
 * Process WhatsApp webhook payload
 */
async function processWebhook(payload) {
  // Validate payload structure
  if (payload.object !== 'whatsapp_business_account') {
    console.log('Not a WhatsApp business account webhook')
    return
  }

  // Use optional chaining carefully or checking existence
  if (!payload.entry) return

  for (const entry of payload.entry) {
    if (!entry.changes) continue

    for (const change of entry.changes) {
      const { value } = change

      // Only process messages
      if (!value.messages || value.messages.length === 0) {
        if (process.env.DEBUG_WEBHOOK === 'true') {
          const hasStatuses = Array.isArray(value.statuses) && value.statuses.length > 0
          console.log(`ℹ️ Webhook received without messages (statuses: ${hasStatuses ? value.statuses.length : 0})`)
        }
        continue
      }

      if (process.env.DEBUG_WEBHOOK === 'true') {
        console.log(`📩 Webhook contains ${value.messages.length} message(s)`)
      }

      for (const message of value.messages) {
        // Only handle text messages for now
        if (message.type !== 'text') {
          console.log(`Unsupported message type: ${message.type}`)
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
    return { valid: false, error: 'El monto debe ser un número válido' }
  }

  if (amount <= 0) {
    return { valid: false, error: 'El monto debe ser mayor a cero' }
  }

  // Description must be 1-500 characters
  if (!description || typeof description !== 'string') {
    return { valid: false, error: 'La descripción es requerida' }
  }

  const trimmedDescription = description.trim()

  if (trimmedDescription.length < 1) {
    return { valid: false, error: 'La descripción debe tener al menos 1 carácter' }
  }

  if (trimmedDescription.length > 500) {
    return { valid: false, error: 'La descripción no puede exceder 500 caracteres' }
  }

  return { valid: true }
}

/**
 * Handle incoming text message
 */
async function handleTextMessage(from, text, messageId) {
  console.log(`📱 Message from ${from}: ${text} (ID: ${messageId})`)

  // 0. Check for duplicate message
  if (processedMessageIds.has(messageId)) {
    console.log(`⏭️ Skipping duplicate message: ${messageId}`)
    return
  }

  // Mark message as processed
  processedMessageIds.set(messageId, Date.now())

  // 1. Check if phone number is authorized
  if (!isAuthorizedPhone(from)) {
    console.log(`❌ Unauthorized phone number: ${from}`)
    return
  }

  // 2. Get user from database
  const user = await getUserByPhone(from)

  if (!user) {
    console.log(`❌ User not found for phone: ${from}`)
    return
  }

  console.log(`✅ User found: ${user.name}`)

  // 3. Check for currency conversion
  const currencyInfo = extractCurrency(text)
  let finalAmount = 0
  let originalAmount
  let originalCurrency

  // 4. Parse the expense message
  const parsed = parseExpenseMessage(text)

  if (currencyInfo) {
    finalAmount = convertToARS(currencyInfo.amount, currencyInfo.currency)
    originalAmount = currencyInfo.amount
    originalCurrency = currencyInfo.currency
    console.log(`💱 Converted ${currencyInfo.amount} ${currencyInfo.currency} to ${finalAmount} ARS`)
  } else {
    finalAmount = parsed.amount
  }

  // 5. If parsing failed, send error message
  if (parsed.needsReview) {
    console.log(`⚠️ Message needs review: ${text}`)
    await sendMessage(from, formatParseErrorMessage())
    return
  }

  // 6. Validate input before creating expense
  const validation = validateExpenseInput(finalAmount, parsed.description)

  if (!validation.valid) {
    console.error(`❌ Invalid expense input: ${validation.error}`)
    console.error(`   Amount: ${finalAmount}, Description: "${parsed.description}"`)
    await sendMessage(from, formatValidationErrorMessage(validation.error))
    return
  }

  // 7. Create expense in Firestore
  try {
    const expenseId = await createExpense({
      userId: user.id,
      userName: user.name,
      amount: finalAmount,
      originalAmount,
      originalCurrency,
      originalInput: text,
      description: parsed.description,
      category: parsed.category || 'general',
      splitAmong: parsed.splitAmong || [],
      timestamp: new Date()
    })

    console.log(`✅ Expense created: ${expenseId}`)

    // 8. Send confirmation message to user
    const confirmationMessage = formatExpenseConfirmation(
      finalAmount,
      originalAmount,
      originalCurrency,
      parsed.description,
      parsed.category || 'general',
      parsed.splitAmong || []
    )

    await sendMessage(from, confirmationMessage)
  } catch (error) {
    console.error('Error creating expense:', error)
    await sendMessage(
      from,
      '❌ *Error al guardar el gasto*\n\nOcurrió un error al procesar tu mensaje. Por favor intenta nuevamente.'
    )
  }
}

export default router
