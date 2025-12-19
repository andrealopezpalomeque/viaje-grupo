// The 11 Travelers
export interface User {
  id: string              // unique string (auto-generated)
  name: string            // Display name (e.g., "Pipi López Palomeque")
  phone: string           // Format: +5493794702813 (Key for WhatsApp identification)
  email: string | null    // Nullable, populated via Google Auth
  aliases: string[]       // For @mention matching (lowercase, e.g., ["pipi"])
  createdAt?: Date
  // Legacy field for backwards compatibility
  phoneNumber?: string
}

// Group for organizing expenses
export interface Group {
  id: string
  name: string
  members: string[]       // Array of user IDs
  createdBy: string       // User ID of creator
  createdAt?: Date
}

// The Expense Record
export interface Expense {
  id: string
  userId: string         // Who paid?
  userName: string       // Denormalized name for easier display
  amount: number         // Always in base currency (ARS)
  originalAmount?: number // Amount entered by user (if different currency)
  originalCurrency?: string // Currency entered by user (e.g., BRL)
  originalInput: string  // The raw text: "50 beers at beach"
  description: string    // Cleaned text: "beers at beach"
  category: ExpenseCategory
  splitAmong?: string[]  // List of user IDs for splitting, empty means everyone
  groupId?: string       // ID of the group this expense belongs to
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
