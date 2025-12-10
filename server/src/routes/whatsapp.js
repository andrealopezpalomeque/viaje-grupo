import { Router } from 'express'
import { getUserByPhone, isAuthorizedPhone } from '../services/userService.js'
import { createExpense } from '../services/expenseService.js'
import { parseExpenseMessage, extractCurrency, convertToARS } from '../utils/messageParser.js'

const router = Router()

/**
 * Webhook verification (required by Meta/WhatsApp)
 * GET /api/whatsapp/webhook
 */
router.get('/webhook', (req, res) => {
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
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body

    // Respond immediately to WhatsApp (required)
    res.sendStatus(200)

    // Process the webhook asynchronously
    await processWebhook(payload)
  } catch (error) {
    console.error('Error processing webhook:', error)
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
async function handleTextMessage(from, text) {
  console.log(`📱 Message from ${from}: ${text}`)

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

  // 5. If parsing failed, mark for review
  if (parsed.needsReview) {
    console.log(`⚠️ Message needs review: ${text}`)
    // Still log it! But maybe categorized as 'review_needed'
    // For Hello World, let's log it anyway so something shows up.
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

    // console.log(`✅ Expense created: ${expenseId}`)
  } catch (error) {
    console.error('Error creating expense:', error)
  }
}

export default router
