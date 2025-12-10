import { defineStore } from 'pinia'
import {
  collection,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore'
import type { User, Balance } from '~/types'

interface UserState {
  users: User[]
  loading: boolean
  error: string | null
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    users: [],
    loading: false,
    error: null
  }),

  getters: {
    getUserById: (state) => (userId: string) => state.users.find((u) => u.id === userId),
    getUserByPhone: (state) => (phoneNumber: string) => state.users.find((u) => u.phoneNumber === phoneNumber),
    getUserInitials: (state) => (userId: string) => {
      const user = state.users.find((u) => u.id === userId)
      if (!user) return '??'
      const names = user.name.split(' ').filter(n => n.length > 0)
      if (names.length >= 2 && names[0] && names[1]) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase()
      }
      return user.name.substring(0, 2).toUpperCase()
    }
  },

  actions: {
    async fetchUsers() {
      const { db } = useFirebase()
      this.loading = true
      this.error = null
      try {
        const usersRef = collection(db, 'users')
        const q = query(usersRef, orderBy('name'))
        const snapshot = await getDocs(q)
        
        this.users = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        })) as User[]
      } catch (err: any) {
        console.error('Error fetching users:', err)
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    calculateBalances(): Balance[] {
      const expenseStore = useExpenseStore()
      // Guard: if no users (or still loading), return empty
      if (this.users.length === 0) return []

      // Initialize balances map
      const balances = new Map<string, { paid: number; share: number }>()
      this.users.forEach(u => balances.set(u.id, { paid: 0, share: 0 }))

      // Process each expense
      expenseStore.expenses.forEach(expense => {
        // 1. Add to payer's 'paid' amount
        const payer = balances.get(expense.userId)
        if (payer) {
          payer.paid += expense.amount
        }

        // 2. Determine who splits this expense
        let splitUserIds: string[] = []

        if (expense.splitAmong && expense.splitAmong.length > 0) {
          // Resolve names to IDs
          // Normalize names for comparison
          splitUserIds = expense.splitAmong.map(name => {
            const cleanName = name.toLowerCase()
            const user = this.users.find(u => u.name.toLowerCase().includes(cleanName))
            return user ? user.id : null
          }).filter((id): id is string => id !== null)
          
          // If no mentioned users found (e.g. invalid names), fallback to everyone? 
          // Or just payer? Let's fallback to everyone for safety, or just the payer if private?
          // For now: if mentions exist but none match, fallback to everyone (simplest)
          if (splitUserIds.length === 0) {
             splitUserIds = this.users.map(u => u.id)
          } else {
             // Add payer to split if they aren't explicitly excluded? 
             // Usually sender says "Lunch @Nico", implies Pipi AND Nico.
             // If Pipi says "Gift for @Nico", Pipi pays, Nico owes? 
             // Standard Splitwise: "Paid by Pipi, split by Pipi and Nico"
             // But if I say "@Nico @Juan", maybe I mean ONLY them?
             // Let's assume: If mentions exist, SPLIT ONLY AMONG MENTIONS.
             // But usually the payer is included. 
             // Let's check if payer is in the mentioned list. If not, add them?
             // "200 Taxi @Nico" -> Pipi paid. Split Pipi & Nico? Or just Nico?
             // Interpretation: "Taxi with Nico". I pay, we both split.
             if (!splitUserIds.includes(expense.userId)) {
               splitUserIds.push(expense.userId)
             }
          }
        } else {
          // Default: Everyone
          splitUserIds = this.users.map(u => u.id)
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

      // Convert map to array
      return this.users.map(user => {
        const data = balances.get(user.id) || { paid: 0, share: 0 }
        return {
          userId: user.id,
          paid: data.paid,
          share: data.share,
          net: data.paid - data.share
        }
      })
    },

    getSortedBalances(): Balance[] {
      return this.calculateBalances().sort((a, b) => b.net - a.net)
    },

    getDebtors(): Balance[] {
      return this.calculateBalances()
        .filter((balance) => balance.net < 0)
        .sort((a, b) => a.net - b.net)
    },

    getCreditors(): Balance[] {
      return this.calculateBalances()
        .filter((balance) => balance.net > 0)
        .sort((a, b) => b.net - a.net)
    },

    getUserTotalPaid(userId: string): number {
      const expenseStore = useExpenseStore()
      const userExpenses = expenseStore.getExpensesByUser(userId)
      return userExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    }
  }
})
