/**
 * WhatsApp Bot Command Service
 * Handles all slash commands for the Text the Check bot
 */

import { getExpensesByGroup, getAllExpensesByGroup, getExpenseById, deleteExpense } from './expenseService.js'
import { getGroupMembers, getAllGroupsByUserId, updateUserActiveGroup, getGroupById } from './userService.js'
import type { User, Group } from '../types/index.js'

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

interface PendingGroupSelection {
  userId: string
  groups: Group[]
  expiresAt: number
}

// Store recent expense list for /borrar command reference
// Key: groupId, Value: array of expense IDs (most recent first)
const recentExpenseCache = new Map<string, string[]>()

// Store pending group selections (for /grupo number response)
// Key: userId, Value: { groups: Group[], expiresAt: timestamp }
const pendingGroupSelections = new Map<string, PendingGroupSelection>()

// 2 minute timeout for group selection
const GROUP_SELECTION_TIMEOUT_MS = 2 * 60 * 1000

/**
 * Clean up expired group selection states
 */
function cleanupExpiredGroupSelections() {
  const now = Date.now()
  for (const [userId, pending] of pendingGroupSelections.entries()) {
    if (pending.expiresAt < now) {
      pendingGroupSelections.delete(userId)
    }
  }
}

// Run cleanup every minute
setInterval(cleanupExpiredGroupSelections, 60 * 1000)

/**
 * Format help message
 */
export function getHelpMessage(): string {
  return `📖 *Cómo usar Text the Check*

*Agregar gasto:*
\`100 taxi\` - Gasto simple
\`USD 50 cena @Juan @María\` - En dólares, dividido

*Monedas:* USD, EUR, BRL (se convierten a ARS)

*Comandos:*
/grupo - Ver y cambiar grupo activo
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

/**
 * Get group command message
 * Shows user's groups and active group, or message for single group
 */
export async function getGroupMessage(userId: string, activeGroupId: string | null): Promise<{ message: string, groups: Group[] }> {
  const groups = await getAllGroupsByUserId(userId)

  if (groups.length === 0) {
    return {
      message: '⚠️ No pertenecés a ningún grupo.',
      groups: []
    }
  }

  if (groups.length === 1) {
    return {
      message: `📍 Tu grupo: *${groups[0].name}*\n\n_(Solo pertenecés a un grupo)_`,
      groups
    }
  }

  // Multiple groups - show numbered list with active group marked
  let message = '📍 *Tus grupos:*\n\n'

  groups.forEach((group, index) => {
    const isActive = group.id === activeGroupId
    message += `${index + 1}. ${group.name}${isActive ? ' ✓' : ''}\n`
  })

  const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0]
  message += `\nGrupo activo: *${activeGroup.name}*\n\n_Respondé con el número para cambiar de grupo._`

  return { message, groups }
}

/**
 * Set up pending group selection for a user
 */
export function setPendingGroupSelection(userId: string, groups: Group[]): void {
  pendingGroupSelections.set(userId, {
    userId,
    groups,
    expiresAt: Date.now() + GROUP_SELECTION_TIMEOUT_MS
  })
}

/**
 * Check if user has a pending group selection
 */
export function hasPendingGroupSelection(userId: string): boolean {
  const pending = pendingGroupSelections.get(userId)
  if (!pending) return false

  // Check if expired
  if (pending.expiresAt < Date.now()) {
    pendingGroupSelections.delete(userId)
    return false
  }

  return true
}

/**
 * Handle number response for group selection
 * Returns CommandResult if this was a group selection, null if not applicable
 */
export async function handleGroupSelectionResponse(
  userId: string,
  text: string
): Promise<CommandResult | null> {
  const pending = pendingGroupSelections.get(userId)

  if (!pending || pending.expiresAt < Date.now()) {
    pendingGroupSelections.delete(userId)
    return null
  }

  // Check if the message is just a number
  const trimmed = text.trim()
  const number = parseInt(trimmed, 10)

  if (isNaN(number) || number < 1 || number > pending.groups.length) {
    // Not a valid number, treat as normal message (expense)
    // But only clear pending state if it's definitely not a number attempt
    if (/^\d+$/.test(trimmed)) {
      // They entered a number but it's out of range
      return {
        success: false,
        message: `⚠️ Número inválido. Elegí un número entre 1 y ${pending.groups.length}.`
      }
    }
    // Not a number at all, clear pending and let it be processed as expense
    pendingGroupSelections.delete(userId)
    return null
  }

  // Valid selection - update the user's active group
  const selectedGroup = pending.groups[number - 1]
  const success = await updateUserActiveGroup(userId, selectedGroup.id)

  // Clear pending state
  pendingGroupSelections.delete(userId)

  if (!success) {
    return {
      success: false,
      message: '❌ Error al cambiar de grupo. Por favor intentá de nuevo.'
    }
  }

  return {
    success: true,
    message: `✅ Grupo activo cambiado a: *${selectedGroup.name}*\n\nTus próximos gastos se registrarán en este grupo.\n\n📊 _Ver detalles en textthecheck.app_`
  }
}

/**
 * Clear pending group selection (for cleanup)
 */
export function clearPendingGroupSelection(userId: string): void {
  pendingGroupSelections.delete(userId)
}
