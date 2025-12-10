// Expense types (matches client types)
export interface Expense {
  id?: string
  userId: string
  userName: string
  amount: number
  originalInput: string
  originalAmount?: number
  originalCurrency?: string
  description: string
  category: ExpenseCategory
  splitAmong?: string[]
  timestamp: Date
}

export type ExpenseCategory = 'food' | 'transport' | 'accommodation' | 'entertainment' | 'general'

// User types
export interface User {
  id: string
  name: string
  phoneNumber: string
  avatar?: string
}

// WhatsApp webhook types
export interface WhatsAppMessage {
  from: string
  id: string
  timestamp: string
  text: {
    body: string
  }
  type: 'text' | 'image' | 'document' | 'audio' | 'video'
}

export interface WhatsAppWebhookPayload {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: string
        metadata: {
          display_phone_number: string
          phone_number_id: string
        }
        contacts?: Array<{
          profile: {
            name: string
          }
          wa_id: string
        }>
        messages?: WhatsAppMessage[]
      }
      field: string
    }>
  }>
}

// Parsed expense from message
export interface ParsedExpense {
  amount: number
  description: string
  category?: ExpenseCategory
  splitAmong: string[] // List of names, empty means everyone
  needsReview: boolean
}
