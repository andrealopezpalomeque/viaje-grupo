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

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phoneNumber,
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

  // Amount line
  if (originalCurrency && originalCurrency !== 'ARS') {
    message += `💰 ${originalCurrency} ${originalAmount?.toFixed(2)} → $${amount.toFixed(2)} ARS\n`
  } else {
    message += `💰 $${amount.toFixed(2)} ARS\n`
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
  return `❌ *No pude entender el mensaje*\n\n` +
    `Por favor usa este formato:\n` +
    `*[monto] [descripción]*\n\n` +
    `Ejemplos:\n` +
    `• 50 almuerzo\n` +
    `• 1500 taxi al aeropuerto\n` +
    `• USD 20 cena @Juan @María\n` +
    `• EUR 45 hotel\n\n` +
    `Monedas soportadas: ARS, USD, EUR, BRL`
}

/**
 * Format error message for validation failures
 */
export function formatValidationErrorMessage(error: string): string {
  return `❌ *Error de validación*\n\n${error}\n\n` +
    `Por favor verifica e intenta nuevamente.`
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
