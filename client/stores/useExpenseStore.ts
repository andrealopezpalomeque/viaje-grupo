import { defineStore } from 'pinia'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp,
  type Unsubscribe
} from 'firebase/firestore'
import type { Expense, ExpenseCategory, CategoryBreakdown } from '~/types'

interface ExpenseState {
  expenses: Expense[]
  loading: boolean
  error: string | null
  unsubscribe: Unsubscribe | null
}

export const useExpenseStore = defineStore('expense', {
  state: (): ExpenseState => ({
    expenses: [],
    loading: false,
    error: null,
    unsubscribe: null
  }),

  getters: {
    /**
     * Get total amount spent across all expenses
     */
    totalSpent: (state): number => {
      return state.expenses.reduce((sum, expense) => sum + expense.amount, 0)
    },

    /**
     * Get expenses sorted by date (newest first)
     */
    sortedExpenses: (state): Expense[] => {
      return [...state.expenses].sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      })
    },

    /**
     * Get category breakdown with totals and counts
     */
    categoryBreakdown: (state): CategoryBreakdown[] => {
      const breakdown = new Map<ExpenseCategory, CategoryBreakdown>()

      state.expenses.forEach((expense) => {
        const existing = breakdown.get(expense.category)
        if (existing) {
          existing.total += expense.amount
          existing.count += 1
        } else {
          breakdown.set(expense.category, {
            category: expense.category,
            total: expense.amount,
            count: 1
          })
        }
      })

      return Array.from(breakdown.values()).sort((a, b) => b.total - a.total)
    },

    /**
     * Get recent expenses (last 10)
     */
    recentExpenses: (state): Expense[] => {
      return state.expenses
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10)
    }
  },

  actions: {
    /**
     * Initialize Firebase realtime listener for expenses
     */
    initializeListeners() {
      const { db } = useFirebase()
      this.loading = true
      this.error = null

      try {
        const expensesRef = collection(db, 'expenses')
        const q = query(expensesRef, orderBy('timestamp', 'desc'))

        // Subscribe to realtime updates
        this.unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            this.expenses = snapshot.docs.map((doc) => {
              const data = doc.data()
              return {
                id: doc.id,
                userId: data.userId,
                userName: data.userName,
                amount: data.amount,
                originalAmount: data.originalAmount,
                originalCurrency: data.originalCurrency,
                originalInput: data.originalInput,
                description: data.description,
                category: data.category,
                timestamp: data.timestamp.toDate()
              } as Expense
            })
            this.loading = false
          },
          (error) => {
            console.error('Error listening to expenses:', error)
            this.error = error.message
            this.loading = false
          }
        )
      } catch (error) {
        console.error('Error initializing listeners:', error)
        this.error = error instanceof Error ? error.message : 'Unknown error'
        this.loading = false
      }
    },

    /**
     * Stop listening to Firebase updates
     */
    stopListeners() {
      if (this.unsubscribe) {
        this.unsubscribe()
        this.unsubscribe = null
      }
    },

    /**
     * Get expenses by specific user
     */
    getExpensesByUser(userId: string): Expense[] {
      return this.expenses.filter((expense) => expense.userId === userId)
    },

    /**
     * Add a new expense (primarily for testing or admin UI)
     */
    async addExpense(
      userId: string,
      userName: string,
      amount: number,
      description: string,
      category: ExpenseCategory,
      originalInput: string
    ) {
      const { db } = useFirebase()

      try {
        const expensesRef = collection(db, 'expenses')
        await addDoc(expensesRef, {
          userId,
          userName,
          amount,
          description,
          category,
          originalInput,
          timestamp: Timestamp.now()
        })
      } catch (error) {
        console.error('Error adding expense:', error)
        throw error
      }
    },

    /**
     * Delete an expense
     */
    async deleteExpense(expenseId: string) {
      const { db } = useFirebase()

      try {
        await deleteDoc(doc(db, 'expenses', expenseId))
      } catch (error) {
        console.error('Error deleting expense:', error)
        throw error
      }
    },

    /**
     * Update an expense
     */
    async updateExpense(
      expenseId: string,
      updates: Partial<Omit<Expense, 'id' | 'timestamp'>>
    ) {
      const { db } = useFirebase()

      try {
        await updateDoc(doc(db, 'expenses', expenseId), updates)
      } catch (error) {
        console.error('Error updating expense:', error)
        throw error
      }
    }
  }
})
