/**
 * WhatsApp Cloud API Service
 * Handles outbound messaging to users
 */

interface SendMessageResponse {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Normalize phone number for WhatsApp API
 * Handles Argentina's special "15" mobile prefix format
 * @param phoneNumber - Phone number in any format
 * @returns Normalized phone number with + prefix
 */
function normalizePhoneNumber(phoneNumber: string): string {
  // Remove any spaces, dashes, or parentheses
  let normalized = phoneNumber.replace(/[\s\-\(\)]/g, '')

  // Add + prefix if missing
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized
  }

  // Handle Argentina mobile numbers
  // WhatsApp sends: 5493794702813 (format: 54 + 9 + area + number)
  // Meta expects: 543791547028013 (format: 54 + area + 15 + number)
  // We need to insert "15" after the area code
  if (normalized.startsWith('+549')) {
    // Argentina mobile number
    // Extract: +549 + [area code] + [number]
    // Convert to: +54 + [area code] + 15 + [number]

    // Remove the '9' after country code and add '15' after area code
    // Area codes in Argentina are 2-4 digits
    // For Corrientes (379), it's 3 digits

    // Pattern: +549[area code][local number]
    // Try matching in order: 3-digit area (most common), then 4-digit, then 2-digit
    const withoutPrefix = normalized.substring(3) // Remove "+54"

    // Try different area code lengths in order of likelihood
    let match =
      withoutPrefix.match(/^9(\d{3})(\d{7})$/) ||  // 3-digit area + 7-digit number
      withoutPrefix.match(/^9(\d{4})(\d{6})$/) ||  // 4-digit area + 6-digit number
      withoutPrefix.match(/^9(\d{2})(\d{8})$/)     // 2-digit area + 8-digit number (Buenos Aires)

    if (match) {
      const areaCode = match[1]
      const localNumber = match[2]

      // Reconstruct: +54 + area + 15 + number
      normalized = `+54${areaCode}15${localNumber}`

      console.log(`🇦🇷 Argentina number detected: +549${areaCode}${localNumber} → ${normalized}`)
    }
  }

  return normalized
}

/**
 * Send a text message to a WhatsApp user
 * @param phoneNumber - Recipient phone number (format: +5491112345678)
 * @param text - Message text to send
 * @returns Promise with success status and message ID
 */
export async function sendMessage(
  phoneNumber: string,
  text: string
): Promise<SendMessageResponse> {
  const apiToken = process.env.WHATSAPP_API_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!apiToken) {
    console.error('❌ WHATSAPP_API_TOKEN not configured')
    return { success: false, error: 'API token not configured' }
  }

  if (!phoneNumberId) {
    console.error('❌ WHATSAPP_PHONE_NUMBER_ID not configured')
    return { success: false, error: 'Phone number ID not configured' }
  }

  // Normalize phone number to ensure + prefix
  const normalizedPhone = normalizePhoneNumber(phoneNumber)
  console.log(`📤 Sending message to: ${phoneNumber} → normalized: ${normalizedPhone}`)

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizedPhone,
    type: 'text',
    text: {
      preview_url: false,
      body: text,
    },
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data: any = await response.json()

    if (!response.ok) {
      console.error('❌ WhatsApp API error:', data)
      return {
        success: false,
        error: data.error?.message || 'Unknown API error',
      }
    }

    console.log('✅ Message sent successfully:', data.messages?.[0]?.id)

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    }
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Format amount in Argentine peso format
 * Uses period for thousands, comma for decimals: $1.702,46
 */
function formatARS(amount: number): string {
  return amount.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/**
 * Format amount in international format (USD, EUR, BRL)
 * Uses comma for thousands, period for decimals: 1,702.46
 */
function formatInternational(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/**
 * Format a success confirmation message for expense creation
 */
export function formatExpenseConfirmation(
  amount: number,
  originalAmount: number | undefined,
  originalCurrency: string | undefined,
  description: string,
  category: string,
  splitAmong: string[]
): string {
  let message = '✅ *Gasto registrado*\n\n'

  // Amount line - use correct format for each currency
  if (originalCurrency && originalCurrency !== 'ARS') {
    message += `💰 ${originalCurrency} ${formatInternational(originalAmount || 0)} → $${formatARS(amount)} ARS\n`
  } else {
    message += `💰 $${formatARS(amount)} ARS\n`
  }

  message += `📝 ${description}\n`
  message += `🏷️ ${getCategoryEmoji(category)} ${category}\n`

  // Split details
  if (splitAmong && splitAmong.length > 0) {
    message += `👥 Dividido entre: ${splitAmong.join(', ')}\n`
  } else {
    message += `👥 Dividido entre todos\n`
  }

  return message
}

/**
 * Format error message for parsing failures
 */
export function formatParseErrorMessage(): string {
  return `⚠️ *No pude entender el mensaje*\n\n` +
    `Usá este formato:\n` +
    `\`[monto] [descripción]\`\n\n` +
    `*Ejemplos:*\n` +
    `• \`50 almuerzo\`\n` +
    `• \`1500 taxi al aeropuerto\`\n` +
    `• \`USD 20 cena @Juan @María\`\n\n` +
    `_Escribí /ayuda para más info_`
}

/**
 * Format error message for validation failures
 */
export function formatValidationErrorMessage(error: string): string {
  return `⚠️ *${error}*\n\n` +
    `*Ejemplos válidos:*\n` +
    `• \`100 taxi\`\n` +
    `• \`USD 50 cena @Juan\`\n\n` +
    `_Escribí /ayuda para más info_`
}

/**
 * Format error message for unknown @mention
 */
export function formatUnknownMentionMessage(mention: string, suggestion?: string): string {
  if (suggestion) {
    return `⚠️ No encontré a *@${mention}*. ¿Quisiste decir *@${suggestion}*?`
  }
  return `⚠️ No encontré a *@${mention}* en el grupo.`
}

/**
 * Get emoji for expense category
 */
function getCategoryEmoji(category: string): string {
  const emojiMap: Record<string, string> = {
    food: '🍽️',
    transport: '🚗',
    accommodation: '🏨',
    entertainment: '🎉',
    general: '📌',
  }

  return emojiMap[category] || '📌'
}
