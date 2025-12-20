<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0">
    <div class="container mx-auto px-4 py-6">
      <!-- Header -->
      <AppHeader />

      <!-- Dashboard Content -->
      <ClientOnly>
        <template #fallback>
          <div class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
            <p class="mt-4 text-gray-600 dark:text-gray-400">Cargando gastos...</p>
          </div>
        </template>

        <!-- Loading State -->
        <div v-if="expenseStore.loading" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
          <p class="mt-4 text-gray-600 dark:text-gray-400">Cargando gastos...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="expenseStore.error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p class="text-red-800 dark:text-red-200">{{ expenseStore.error }}</p>
        </div>

        <!-- Dashboard Tabs -->
        <div v-else>
          <!-- Inicio Tab (Personal Summary) -->
          <div v-show="activeTab === 'inicio'" class="space-y-4">
            <!-- Balance Summary -->
            <BalanceSummary :balance="myBalance" />

            <!-- Debts Section (people I owe) -->
            <DebtSection
              :debts="myDebts"
              @show-payment-info="showPaymentInfo"
            />

            <!-- Credits Section (people who owe me) -->
            <CreditSection :credits="myCredits" />

            <!-- My Recent Expenses -->
            <ExpenseList
              :expenses="myRecentExpenses"
              :current-user-id="currentUserId"
              title="Tus Gastos Recientes"
              show-user-share
              show-add-button
              empty-message="No tenes gastos aun"
              @add-expense="openExpenseModal"
            />
          </div>

          <!-- Grupo Tab (Group Overview) -->
          <div v-show="activeTab === 'grupo'" class="space-y-4">
            <!-- Group Stats -->
            <GroupStats
              :member-count="userStore.users.length"
              :expense-count="expenseStore.expenses.length"
              :total-spent="expenseStore.totalSpent"
            />

            <!-- Filters -->
            <ExpenseFilters />
            <ExpenseFilterChips />

            <!-- Balance List -->
            <BalanceList
              :balances="sortedBalances"
              :current-user-id="currentUserId"
            />

            <!-- Settlement List -->
            <SettlementList :settlements="settlements" />

            <!-- All Group Activity -->
            <ExpenseList
              :expenses="filteredExpenses"
              :current-user-id="currentUserId"
              title="Actividad del Grupo"
              show-count
              :limit="10"
            />
          </div>
        </div>
      </ClientOnly>
    </div>

    <!-- Bottom Navigation -->
    <BottomNav />

    <!-- Expense Modal -->
    <ExpenseModal />

    <!-- Payment Info Modal -->
    <PaymentInfoModal
      v-if="showPaymentModal"
      :user="paymentModalUser"
      @close="closePaymentModal"
    />
  </div>
</template>

<script setup lang="ts">
import type { User, Settlement } from '~/types'

definePageMeta({
  middleware: ['auth']
})

const { firestoreUser } = useAuth()
const expenseStore = useExpenseStore()
const userStore = useUserStore()
const { activeTab, openExpenseModal } = useNavigationState()
const { filterByPerson, filterByPayer } = useExpenseFilters()

// Current user ID
const currentUserId = computed(() => firestoreUser.value?.id || '')

// Balance calculations
const sortedBalances = computed(() => userStore.getSortedBalances())
const settlements = computed(() => userStore.calculateSettlements())

// Personal balance (for Inicio tab)
const myBalance = computed(() => {
  const balances = userStore.calculateBalances()
  const myBalanceData = balances.find(b => b.userId === currentUserId.value)
  return myBalanceData?.net || 0
})

// My debts (settlements where I owe someone)
const myDebts = computed<Settlement[]>(() => {
  return settlements.value.filter(s => s.fromUserId === currentUserId.value)
})

// My credits (settlements where someone owes me)
const myCredits = computed<Settlement[]>(() => {
  return settlements.value.filter(s => s.toUserId === currentUserId.value)
})

// My recent expenses (expenses that involve me)
const myRecentExpenses = computed(() => {
  return expenseStore.expenses
    .filter(expense => {
      // I paid for it
      if (expense.userId === currentUserId.value) return true

      // I'm in the split
      if (!expense.splitAmong || expense.splitAmong.length === 0) return true
      return expense.splitAmong.includes(currentUserId.value)
    })
    .slice(0, 10)
})

// Filtered expenses for Grupo tab
const filteredExpenses = computed(() => {
  let result = expenseStore.expenses

  // Filter by person
  if (filterByPerson.value) {
    result = result.filter(expense => {
      const isInvolved = expense.userId === filterByPerson.value ||
        (expense.splitAmong && expense.splitAmong.includes(filterByPerson.value!)) ||
        (!expense.splitAmong || expense.splitAmong.length === 0)
      return isInvolved
    })
  }

  // Filter by payer
  if (filterByPayer.value === 'me') {
    result = result.filter(e => e.userId === currentUserId.value)
  } else if (filterByPayer.value === 'others') {
    result = result.filter(e => e.userId !== currentUserId.value)
  }

  return result
})

// Payment info modal
const showPaymentModal = ref(false)
const paymentModalUser = ref<User | null>(null)

const showPaymentInfo = (userId: string) => {
  const user = userStore.getUserById(userId)
  if (user) {
    paymentModalUser.value = user
    showPaymentModal.value = true
  }
}

const closePaymentModal = () => {
  showPaymentModal.value = false
  paymentModalUser.value = null
}
</script>
