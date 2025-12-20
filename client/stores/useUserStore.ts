import { defineStore } from 'pinia'
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  documentId,
  doc,
  updateDoc
} from 'firebase/firestore'
import type { User, Balance, Settlement, PaymentInfo } from '~/types'

interface UserState {
  users: User[]
  allUsers: User[] // All users (unfiltered)
  loading: boolean
  error: string | null
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    users: [],
    allUsers: [],
    loading: false,
    error: null
  }),

  getters: {
    getUserById: (state) => (userId: string) => state.users.find((u) => u.id === userId),
    getUserByPhone: (state) => (phoneNumber: string) => state.users.find((u) =>
      u.phone === phoneNumber || u.phoneNumber === phoneNumber
    ),
    getUserInitials: (state) => (userId: string, fallbackName?: string): string => {
      const user = state.users.find((u) => u.id === userId)
      const name = user ? user.name : fallbackName

      if (!name) return '??'

      const names = name.split(' ').filter(n => n.length > 0)
      if (names.length >= 2 && names[0] && names[1]) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
  },

  actions: {
    /**
     * Fetch all users or users by member IDs
     * @param memberIds - Optional array of user IDs to filter by (for group members)
     */
    async fetchUsers(memberIds?: string[]) {
      const { db } = useFirebase()
      this.loading = true
      this.error = null
      try {
        const usersRef = collection(db, 'users')

        // If memberIds provided and not empty, filter by those IDs
        if (memberIds && memberIds.length > 0) {
          // Firestore 'in' queries limited to 30 items, batch if needed
          const batches: User[][] = []
          for (let i = 0; i < memberIds.length; i += 30) {
            const batch = memberIds.slice(i, i + 30)
            const q = query(usersRef, where(documentId(), 'in', batch))
            const snapshot = await getDocs(q)
            batches.push(snapshot.docs.map(doc => ({
              ...doc.data(),
              id: doc.id,
            })) as User[])
          }
          const users = batches.flat().sort((a, b) => a.name.localeCompare(b.name))
          this.users = users
          this.allUsers = users
        } else {
          // Fetch all users
          const q = query(usersRef, orderBy('name'))
          const snapshot = await getDocs(q)
          const users = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
          })) as User[]
          this.users = users
          this.allUsers = users
        }
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
          // splitAmong now contains user IDs directly (from fuzzy matching)
          // Filter to only include valid user IDs that exist in our users list
          splitUserIds = expense.splitAmong.filter(id =>
            this.users.some(u => u.id === id)
          )

          // If no valid users found, fallback to everyone
          if (splitUserIds.length === 0) {
            splitUserIds = this.users.map(u => u.id)
          } else {
            // Add payer to split if they aren't explicitly included
            // "200 Taxi @Nico" -> Pipi paid. Split between Pipi & Nico.
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
    },

    /**
     * Calculate settlement recommendations (who should pay whom)
     * Uses direct-only algorithm: only creates settlements between people who shared expenses
     */
    calculateSettlements(): Settlement[] {
      const expenseStore = useExpenseStore()
      const settlements: Settlement[] = []

      // Build a debt graph: track how much each person owes each other person
      // debtGraph[debtor][creditor] = amount debtor owes creditor
      const debtGraph = new Map<string, Map<string, number>>()

      // Initialize debt graph
      this.users.forEach(user => {
        debtGraph.set(user.id, new Map<string, number>())
      })

      // Process each expense to build direct debt relationships
      expenseStore.expenses.forEach(expense => {
        const payerId = expense.userId

        // Determine who splits this expense
        let splitUserIds: string[] = []

        if (expense.splitAmong && expense.splitAmong.length > 0) {
          splitUserIds = expense.splitAmong.filter(id =>
            this.users.some(u => u.id === id)
          )

          if (splitUserIds.length === 0) {
            splitUserIds = this.users.map(u => u.id)
          } else if (!splitUserIds.includes(payerId)) {
            splitUserIds.push(payerId)
          }
        } else {
          splitUserIds = this.users.map(u => u.id)
        }

        // Calculate share per person
        const shareAmount = expense.amount / splitUserIds.length

        // Each participant (except payer) owes the payer their share
        splitUserIds.forEach(participantId => {
          if (participantId !== payerId) {
            const debtorDebts = debtGraph.get(participantId)
            if (debtorDebts) {
              const currentDebt = debtorDebts.get(payerId) || 0
              debtorDebts.set(payerId, currentDebt + shareAmount)
            }
          }
        })
      })

      // Now simplify the debt graph by netting out mutual debts
      // If A owes B $100 and B owes A $60, simplify to A owes B $40
      this.users.forEach(userA => {
        this.users.forEach(userB => {
          if (userA.id >= userB.id) return // Only process each pair once

          const aOwesB = debtGraph.get(userA.id)?.get(userB.id) || 0
          const bOwesA = debtGraph.get(userB.id)?.get(userA.id) || 0

          if (aOwesB > bOwesA) {
            // A owes B the net amount
            debtGraph.get(userA.id)?.set(userB.id, aOwesB - bOwesA)
            debtGraph.get(userB.id)?.set(userA.id, 0)
          } else if (bOwesA > aOwesB) {
            // B owes A the net amount
            debtGraph.get(userB.id)?.set(userA.id, bOwesA - aOwesB)
            debtGraph.get(userA.id)?.set(userB.id, 0)
          } else {
            // They're even
            debtGraph.get(userA.id)?.set(userB.id, 0)
            debtGraph.get(userB.id)?.set(userA.id, 0)
          }
        })
      })

      // Convert debt graph to settlement list
      debtGraph.forEach((creditors, debtorId) => {
        creditors.forEach((amount, creditorId) => {
          if (amount > 0.01) { // Only meaningful debts
            settlements.push({
              fromUserId: debtorId,
              toUserId: creditorId,
              amount: Math.round(amount)
            })
          }
        })
      })

      // Sort settlements for consistent display (largest amounts first)
      return settlements.sort((a, b) => b.amount - a.amount)
    },

    /**
     * Update user's payment info
     */
    async updateUserPaymentInfo(userId: string, paymentInfo: PaymentInfo) {
      const { db } = useFirebase()

      try {
        const userRef = doc(db, 'users', userId)
        await updateDoc(userRef, { paymentInfo })

        // Update local state
        const user = this.users.find(u => u.id === userId)
        if (user) {
          user.paymentInfo = paymentInfo
        }
        const allUser = this.allUsers.find(u => u.id === userId)
        if (allUser) {
          allUser.paymentInfo = paymentInfo
        }
      } catch (err: any) {
        console.error('Error updating payment info:', err)
        throw err
      }
    }
  }
})
