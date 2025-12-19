import type { ParsedExpense, ExpenseCategory } from '../types/index.js'

/**
 * Parse expense from WhatsApp message
 * Expected format: "50 lunch at beach"
 * Returns: { amount: 50, description: "lunch at beach" }
 */
export const parseExpenseMessage = (message: string): ParsedExpense => {
  // Trim and normalize
  const normalized = message.trim()

  // Extract mentions
  const mentions: string[] = []
  // Regex to match @Name (alphanumeric)
  const mentionRegex = /@([a-zA-Z0-9_]+)/g
  const cleanMessage = normalized.replace(mentionRegex, (_match, name) => {
    mentions.push(name)
    return '' // Remove mention from text
  }).trim()

  // Attempt to match: number followed by description
  // Regex: ^(\d+(?:\.\d+)?)\s+(.+)$
  const match = cleanMessage.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/i)

  if (!match) {
    return {
      amount: 0,
      description: message,
      splitAmong: [],
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
    splitAmong: mentions,
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
  const match = message.match(/(\d+(?:[.,]\d+)?)\s*(usd|ars|eur|brl|real|reais|reales)/i)

  if (match) {
    const amount = parseFloat(match[1].replace(',', '.'))
    const rawCurrency = match[2].toLowerCase()

    const currencyMap: Record<string, string> = {
      usd: 'USD',
      ars: 'ARS',
      eur: 'EUR',
      brl: 'BRL',
      real: 'BRL',
      reais: 'BRL',
      reales: 'BRL'
    }

    const currency = currencyMap[rawCurrency] || rawCurrency.toUpperCase()
    return { amount, currency: currency as 'USD' | 'ARS' | 'EUR' | 'BRL' }
  }

  return null
}

/**
 * Convert supported currencies to ARS
 * NOTE: This function has been moved to services/exchangeRateService.ts
 * The new version uses live exchange rates from DolarApi.com with caching
 *
 * @deprecated Use convertToARS from services/exchangeRateService.ts instead
 */
