// The 11 Travelers
export interface User {
  id: string          // unique string (can be phone number or uuid)
  name: string        // Display name (e.g., "Nico")
  phoneNumber: string // Format: +54911... (Key for WhatsApp identification)
  avatar?: string     // URL or Initials
}

// The Expense Record
export interface Expense {
  id: string
  userId: string         // Who paid?
  userName: string       // Denormalized name for easier display
  amount: number         // Always in base currency (e.g., USD)
  originalInput: string  // The raw text: "50 beers at beach"
  description: string    // Cleaned text: "beers at beach"
  category: ExpenseCategory
  timestamp: Date        // Firestore Timestamp
}

export type ExpenseCategory = 'food' | 'transport' | 'accommodation' | 'entertainment' | 'general'

// For the UI "Who Owes Who" calculation
export interface Balance {
  userId: string
  paid: number   // Total amount this person put into the pot
  share: number  // How much they SHOULD have paid (Total / 11)
  net: number    // paid - share (Positive = owed money, Negative = owes money)
}

// Category breakdown for dashboard
export interface CategoryBreakdown {
  category: ExpenseCategory
  total: number
  count: number
}

// Firestore document with converter support
export interface FirestoreDocument {
  id: string
  createdAt?: Date
  updatedAt?: Date
}
