/**
 * Format currency using ES-AR locale
 * Format: $ 1.234,00
 */
export const formatCurrency = (amount: number): string => {
  return formatCurrencyByCode(amount, 'ARS')
}

/**
 * Format currency without symbol
 */
export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format currency with custom ISO code (defaults to ARS)
 */
export const formatCurrencyByCode = (amount: number, currencyCode: string = 'ARS'): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}
