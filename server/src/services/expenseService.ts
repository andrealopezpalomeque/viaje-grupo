import { db } from '../config/firebase.js'
import type { Expense } from '../types/index.js'
import { FieldValue } from 'firebase-admin/firestore'

/**
 * Create a new expense in Firestore
 */
export const createExpense = async (expense: Expense): Promise<string> => {
  try {
    const expensesRef = db.collection('expenses')

    const payload: Record<string, unknown> = {
      userId: expense.userId,
      userName: expense.userName,
      amount: expense.amount,
      originalInput: expense.originalInput,
      description: expense.description,
      category: expense.category,
      splitAmong: expense.splitAmong || [],
      timestamp: FieldValue.serverTimestamp()
    }

    if (expense.originalAmount !== undefined) {
      payload.originalAmount = expense.originalAmount
    }

    if (expense.originalCurrency !== undefined) {
      payload.originalCurrency = expense.originalCurrency
    }

    const docRef = await expensesRef.add(payload)

    return docRef.id
  } catch (error) {
    console.error('Error creating expense:', error)
    throw error
  }
}

/**
 * Get all expenses for a user
 */
export const getExpensesByUser = async (userId: string): Promise<Expense[]> => {
  try {
    const expensesRef = db.collection('expenses')
    const snapshot = await expensesRef
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .get()

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Expense[]
  } catch (error) {
    console.error('Error getting expenses:', error)
    return []
  }
}

/**
 * Delete an expense
 */
export const deleteExpense = async (expenseId: string): Promise<void> => {
  try {
    await db.collection('expenses').doc(expenseId).delete()
  } catch (error) {
    console.error('Error deleting expense:', error)
    throw error
  }
}
