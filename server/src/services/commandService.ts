/**
 * WhatsApp Bot Command Service
 * Handles all slash commands for the ViajeGrupo bot
 */

import { getExpensesByGroup, getAllExpensesByGroup, getExpenseById, deleteExpense } from './expenseService.js'
import { getGroupMembers } from './userService.js'
import type { User } from '../types/index.js'

interface CommandResult {
  success: boolean
  message: string
}

interface Balance {
  userId: string
  userName: string
  paid: number
  share: number
  net: number
}

// Store recent expense list for /borrar command reference
// Key: groupId, Value: array of expense IDs (most recent first)
const recentExpenseCache = new Map<string, string[]>()

/**
 * Format help message
 */
export function getHelpMessage(): string {
  return `📖 *Cómo usar ViajeGrupo*

*Agregar gasto:*
\`100 taxi\` - Gasto simple
\`USD 50 cena @Juan @María\` - En dólares, dividido

*Monedas:* USD, EUR, BRL (se convierten a ARS)

*Comandos:*
/balance - Ver saldos
/lista - Ver últimos gastos
/borrar [n] - Eliminar gasto
/ayuda - Ver esta ayuda`
}

/**
 * Calculate balances for a group (Splitwise-style)
 * Ported from client/stores/useUserStore.ts
 */
export async function calculateGroupBalances(groupId: string, members: User[]): Promise<Balance[]> {
  const expenses = await getAllExpensesByGroup(groupId)

  // Initialize balances map
  const balances = new Map<string, { paid: number; share: number }>()
  members.forEach(u => balances.set(u.id, { paid: 0, share: 0 }))

  // Process each expense
  expenses.forEach(expense => {
    // 1. Add to payer's 'paid' amount
    const payer = balances.get(expense.userId)
    if (payer) {
      payer.paid += expense.amount
    }

    // 2. Determine who splits this expense
    let splitUserIds: string[] = []

    if (expense.splitAmong && expense.splitAmong.length > 0) {
      // splitAmong contains user IDs directly
      splitUserIds = expense.splitAmong.filter(id =>
        members.some(u => u.id === id)
      )

      // If no valid users found, fallback to everyone
      if (splitUserIds.length === 0) {
        splitUserIds = members.map(u => u.id)
      } else {
        // Add payer to split if they aren't explicitly included
        if (!splitUserIds.includes(expense.userId)) {
          splitUserIds.push(expense.userId)
        }
      }
    } else {
      // Default: Everyone
      splitUserIds = members.map(u => u.id)
    }

    // 3. Add to 'share' amount for each splitter
    const shareAmount = expense.amount / splitUserIds.length
    splitUserIds.forEach(uid => {
      const person = balances.get(uid)
      if (person) {
        person.share += shareAmount
      }
    })
  })

  // Convert map to array with user names
  return members.map(user => {
    const data = balances.get(user.id) || { paid: 0, share: 0 }
    return {
      userId: user.id,
      userName: user.name,
      paid: data.paid,
      share: data.share,
      net: data.paid - data.share
    }
  }).sort((a, b) => b.net - a.net) // Sort by net (creditors first)
}

/**
 * Format balance message
 */
export async function getBalanceMessage(groupId: string): Promise<string> {
  const members = await getGroupMembers(groupId)

  if (members.length === 0) {
    return '⚠️ No se encontraron miembros en el grupo.'
  }

  const balances = await calculateGroupBalances(groupId, members)

  // Check if there are any expenses
  const hasExpenses = balances.some(b => b.paid > 0 || b.share > 0)
  if (!hasExpenses) {
    return '💰 *Balances del grupo*\n\nNo hay gastos registrados todavía.'
  }

  let message = '💰 *Balances del grupo*\n\n'

  balances.forEach(balance => {
    const firstName = balance.userName.split(' ')[0]
    const netAmount = Math.abs(balance.net)
    const formattedAmount = formatCurrency(netAmount)

    if (balance.net > 0) {
      message += `${firstName}: +${formattedAmount} (le deben)\n`
    } else if (balance.net < 0) {
      message += `${firstName}: -${formattedAmount} (debe)\n`
    } else {
      message += `${firstName}: $0 (al día)\n`
    }
  })

  return message.trim()
}

/**
 * Format relative date in Spanish
 */
function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'hoy'
  } else if (diffDays === 1) {
    return 'ayer'
  } else if (diffDays < 7) {
    return `hace ${diffDays} días`
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `hace ${weeks} semana${weeks > 1 ? 's' : ''}`
  } else {
    const months = Math.floor(diffDays / 30)
    return `hace ${months} mes${months > 1 ? 'es' : ''}`
  }
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

/**
 * Get expense list message
 */
export async function getExpenseListMessage(groupId: string): Promise<string> {
  const expenses = await getExpensesByGroup(groupId, 10)

  if (expenses.length === 0) {
    return '📋 *Últimos gastos*\n\nNo hay gastos registrados todavía.'
  }

  // Cache expense IDs for /borrar command
  recentExpenseCache.set(groupId, expenses.map(e => e.id!))

  let message = '📋 *Últimos gastos*\n\n'

  expenses.forEach((expense, index) => {
    const amount = formatCurrency(expense.amount)
    const date = formatRelativeDate(expense.timestamp)
    const firstName = expense.userName.split(' ')[0]

    message += `${index + 1}. ${amount} ${expense.description} - ${firstName} (${date})\n`
  })

  message += '\n_Usá /borrar [n] para eliminar un gasto_'

  return message.trim()
}

/**
 * Delete expense command
 * @param indexOrId - Either a number (1-based index from /lista) or expense ID
 * @param userId - The user requesting deletion (must be the creator)
 * @param groupId - The group the expense belongs to
 */
export async function deleteExpenseCommand(
  indexOrId: string,
  userId: string,
  groupId: string
): Promise<CommandResult> {
  let expenseId: string | null = null

  // Check if it's a number (index from /lista)
  const index = parseInt(indexOrId, 10)
  if (!isNaN(index) && index > 0) {
    // Get from cache
    const cachedIds = recentExpenseCache.get(groupId)
    if (cachedIds && cachedIds[index - 1]) {
      expenseId = cachedIds[index - 1]
    } else {
      // Refresh cache and try again
      const expenses = await getExpensesByGroup(groupId, 10)
      recentExpenseCache.set(groupId, expenses.map(e => e.id!))

      if (expenses[index - 1]) {
        expenseId = expenses[index - 1].id!
      }
    }

    if (!expenseId) {
      return {
        success: false,
        message: `⚠️ No encontré el gasto #${index}. Usá /lista para ver los gastos disponibles.`
      }
    }
  } else {
    // Assume it's an expense ID
    expenseId = indexOrId
  }

  // Get the expense
  const expense = await getExpenseById(expenseId)

  if (!expense) {
    return {
      success: false,
      message: '⚠️ No encontré ese gasto. ¿Quizás ya fue eliminado?'
    }
  }

  // Check if the user is the creator
  if (expense.userId !== userId) {
    const creatorFirstName = expense.userName.split(' ')[0]
    return {
      success: false,
      message: `⚠️ Solo ${creatorFirstName} puede eliminar este gasto.`
    }
  }

  // Delete the expense
  try {
    await deleteExpense(expenseId)

    // Update cache
    const cachedIds = recentExpenseCache.get(groupId)
    if (cachedIds) {
      const newIds = cachedIds.filter(id => id !== expenseId)
      recentExpenseCache.set(groupId, newIds)
    }

    return {
      success: true,
      message: `✅ *Gasto eliminado*\n\n${formatCurrency(expense.amount)} ${expense.description}`
    }
  } catch (error) {
    console.error('Error deleting expense:', error)
    return {
      success: false,
      message: '❌ Error al eliminar el gasto. Por favor intentá de nuevo.'
    }
  }
}

/**
 * Unknown command message
 */
export function getUnknownCommandMessage(command: string): string {
  return `❓ Comando no reconocido: ${command}\n\nEscribí /ayuda para ver los comandos disponibles.`
}

/**
 * Parse a command from text
 * Returns null if it's not a command
 */
export function parseCommand(text: string): { command: string; args: string } | null {
  const trimmed = text.trim()

  if (!trimmed.startsWith('/')) {
    return null
  }

  const parts = trimmed.split(/\s+/)
  const command = parts[0].toLowerCase()
  const args = parts.slice(1).join(' ')

  return { command, args }
}

/**
 * Check if text is a command
 */
export function isCommand(text: string): boolean {
  return text.trim().startsWith('/')
}
