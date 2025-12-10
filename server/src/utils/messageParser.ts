import type { ParsedExpense, ExpenseCategory } from '../types/index.js'

/**
 * Parse expense from WhatsApp message
 * Expected format: "50 lunch at beach"
 * Returns: { amount: 50, description: "lunch at beach" }
 */
export const parseExpenseMessage = (message: string): ParsedExpense => {
  // Trim and normalize
  const normalized = message.trim().toLowerCase()

  // Attempt to match: number followed by description
  // Regex: ^(\d+(?:\.\d+)?)\s+(.+)$
  const match = normalized.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/)

  if (!match) {
    return {
      amount: 0,
      description: message,
      needsReview: true
    }
  }

  const amountStr = match[1].replace(',', '.')
  const amount = parseFloat(amountStr)
  const description = match[2].trim()

  // Auto-categorize based on keywords
  const category = categorizeExpense(description)

  return {
    amount,
    description,
    category,
    needsReview: false
  }
}

/**
 * Automatically categorize expense based on keywords
 */
const categorizeExpense = (description: string): ExpenseCategory => {
  const keywords: Record<ExpenseCategory, string[]> = {
    food: [
      'lunch', 'almuerzo', 'dinner', 'cena', 'breakfast', 'desayuno',
      'comida', 'restaurant', 'restaurante', 'pizza', 'burger',
      'coffee', 'café', 'beer', 'cerveza', 'drink', 'bebida',
      'snack', 'groceries', 'supermercado', 'market', 'mercado'
    ],
    transport: [
      'taxi', 'uber', 'bus', 'colectivo', 'train', 'tren',
      'metro', 'subway', 'flight', 'vuelo', 'car', 'auto',
      'rental', 'alquiler', 'gas', 'nafta', 'parking', 'estacionamiento'
    ],
    accommodation: [
      'hotel', 'airbnb', 'hostel', 'alojamiento', 'lodging',
      'rent', 'alquiler', 'house', 'casa', 'apartment', 'apartamento'
    ],
    entertainment: [
      'ticket', 'entrada', 'show', 'espectaculo', 'museum', 'museo',
      'tour', 'excursion', 'excursión', 'activity', 'actividad',
      'game', 'juego', 'movie', 'cine', 'theater', 'teatro',
      'club', 'bar', 'disco', 'party', 'fiesta'
    ],
    general: []
  }

  const lowerDesc = description.toLowerCase()

  for (const [category, words] of Object.entries(keywords)) {
    if (category === 'general') continue

    for (const word of words) {
      if (lowerDesc.includes(word)) {
        return category as ExpenseCategory
      }
    }
  }

  return 'general'
}

/**
 * Extract currency conversion if mentioned
 * Example: "5000 ars lunch" -> { amount: 5000, currency: 'ARS' }
 */
export const extractCurrency = (message: string): { amount: number; currency: string } | null => {
  const match = message.match(/(\d+(?:[.,]\d+)?)\s*(usd|ars|eur)/i)

  if (match) {
    const amount = parseFloat(match[1].replace(',', '.'))
    const currency = match[2].toUpperCase()
    return { amount, currency }
  }

  return null
}

/**
 * Convert ARS to USD (static rate for now)
 * TODO: Integrate with live exchange rate API
 */
export const convertToUSD = (amount: number, currency: string): number => {
  const rates: Record<string, number> = {
    USD: 1,
    ARS: 0.0012, // Approximate rate, should be updated
    EUR: 1.1
  }

  return amount * (rates[currency] || 1)
}
