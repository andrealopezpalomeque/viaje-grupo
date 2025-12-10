import { defineStore } from 'pinia'
import type { User, Balance } from '~/types'

interface UserState {
  users: User[]
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    // Static list of 11 travelers
    // TODO: Replace with actual user data
    users: [
      { id: '1', name: 'Usuario 1', phoneNumber: '+5491100000001' },
      { id: '2', name: 'Usuario 2', phoneNumber: '+5491100000002' },
      { id: '3', name: 'Usuario 3', phoneNumber: '+5491100000003' },
      { id: '4', name: 'Usuario 4', phoneNumber: '+5491100000004' },
      { id: '5', name: 'Usuario 5', phoneNumber: '+5491100000005' },
      { id: '6', name: 'Usuario 6', phoneNumber: '+5491100000006' },
      { id: '7', name: 'Usuario 7', phoneNumber: '+5491100000007' },
      { id: '8', name: 'Usuario 8', phoneNumber: '+5491100000008' },
      { id: '9', name: 'Usuario 9', phoneNumber: '+5491100000009' },
      { id: '10', name: 'Usuario 10', phoneNumber: '+5491100000010' },
      { id: '11', name: 'Usuario 11', phoneNumber: '+5491100000011' }
    ]
  }),

  getters: {
    /**
     * Get user by ID
     */
    getUserById: (state) => {
      return (userId: string): User | undefined => {
        return state.users.find((user) => user.id === userId)
      }
    },

    /**
     * Get user by phone number
     */
    getUserByPhone: (state) => {
      return (phoneNumber: string): User | undefined => {
        return state.users.find((user) => user.phoneNumber === phoneNumber)
      }
    },

    /**
     * Get user initials for avatar
     */
    getUserInitials: (state) => {
      return (userId: string): string => {
        const user = state.users.find((u) => u.id === userId)
        if (!user) return '??'

        const names = user.name.split(' ')
        if (names.length >= 2) {
          return `${names[0][0]}${names[1][0]}`.toUpperCase()
        }
        return user.name.substring(0, 2).toUpperCase()
      }
    }
  },

  actions: {
    /**
     * Calculate balances for all users (Splitwise-style logic)
     * This method depends on the expense store
     */
    calculateBalances(): Balance[] {
      const expenseStore = useExpenseStore()
      const totalSpent = expenseStore.totalSpent
      const sharePerPerson = totalSpent / this.users.length

      return this.users.map((user) => {
        const userExpenses = expenseStore.getExpensesByUser(user.id)
        const paid = userExpenses.reduce((sum, expense) => sum + expense.amount, 0)
        const net = paid - sharePerPerson

        return {
          userId: user.id,
          paid,
          share: sharePerPerson,
          net
        }
      })
    },

    /**
     * Get balances sorted by net amount (who owes most/gets back most)
     */
    getSortedBalances(): Balance[] {
      return this.calculateBalances().sort((a, b) => b.net - a.net)
    },

    /**
     * Get users who owe money (negative balance)
     */
    getDebtors(): Balance[] {
      return this.calculateBalances()
        .filter((balance) => balance.net < 0)
        .sort((a, b) => a.net - b.net)
    },

    /**
     * Get users who are owed money (positive balance)
     */
    getCreditors(): Balance[] {
      return this.calculateBalances()
        .filter((balance) => balance.net > 0)
        .sort((a, b) => b.net - a.net)
    },

    /**
     * Calculate total amount paid by a specific user
     */
    getUserTotalPaid(userId: string): number {
      const expenseStore = useExpenseStore()
      const userExpenses = expenseStore.getExpensesByUser(userId)
      return userExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    }
  }
})
