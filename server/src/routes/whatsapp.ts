import { Router, type Request, type Response } from 'express'
import type { WhatsAppWebhookPayload } from '../types/index.js'
import { getUserByPhone, isAuthorizedPhone } from '../services/userService.js'
import { createExpense } from '../services/expenseService.js'
import { parseExpenseMessage, extractCurrency, convertToARS } from '../utils/messageParser.js'

const router = Router()

/**
 * Webhook verification (required by Meta/WhatsApp)
 * GET /api/whatsapp/webhook
 */
router.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Webhook verified')
    res.status(200).send(challenge)
  } else {
    console.error('❌ Webhook verification failed')
    res.sendStatus(403)
  }
})

/**
 * Webhook handler (receives messages from WhatsApp)
 * POST /api/whatsapp/webhook
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const payload = req.body as WhatsAppWebhookPayload

    // Respond immediately to WhatsApp (required)
    res.sendStatus(200)

    // Process the webhook asynchronously
    await processWebhook(payload)
  } catch (error) {
    console.error('Error processing webhook:', error)
    res.sendStatus(500)
  }
})

/**
 * Process WhatsApp webhook payload
 */
async function processWebhook(payload: WhatsAppWebhookPayload) {
  // Validate payload structure
  if (payload.object !== 'whatsapp_business_account') {
    console.log('Not a WhatsApp business account webhook')
    return
  }

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const { value } = change

      // Only process messages
      if (!value.messages || value.messages.length === 0) {
        continue
      }

      for (const message of value.messages) {
        // Only handle text messages for now
        if (message.type !== 'text') {
          console.log(`Unsupported message type: ${message.type}`)
          continue
        }

        await handleTextMessage(message.from, message.text.body)
      }
    }
  }
}

/**
 * Handle incoming text message
 */
async function handleTextMessage(from: string, text: string) {
  console.log(`📱 Message from ${from}: ${text}`)

  // 1. Check if phone number is authorized
  if (!isAuthorizedPhone(from)) {
    console.log(`❌ Unauthorized phone number: ${from}`)
    // TODO: Send reply "Access Denied"
    return
  }

  // 2. Get user from database
  const user = await getUserByPhone(from)
  if (!user) {
    console.log(`❌ User not found for phone: ${from}`)
    // TODO: Send reply "User not found. Contact admin."
    return
  }

  console.log(`✅ User found: ${user.name}`)

  // 3. Check for currency conversion
  const currencyInfo = extractCurrency(text)
  let finalAmount = 0
  let originalAmount: number | undefined
  let originalCurrency: string | undefined

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

  // 5. If parsing failed, mark for review
  if (parsed.needsReview) {
    console.log(`⚠️ Message needs review: ${text}`)
    // TODO: Store in a "pending_review" collection
    // TODO: Send reply "Message format unclear. Please use: Amount Description (e.g., 50 lunch)"
    return
  }

  // 6. Create expense in Firestore
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
      timestamp: new Date()
    })

    console.log(`✅ Expense created: ${expenseId}`)
    // TODO: Send confirmation message to user
    // Example: "✅ Registered: $50.00 - lunch at beach (Food)"
  } catch (error) {
    console.error('Error creating expense:', error)
    // TODO: Send error message to user
  }
}

export default router
