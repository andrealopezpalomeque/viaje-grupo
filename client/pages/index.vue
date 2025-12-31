<template>
  <!-- Full-page loading state - show until all data is ready -->
  <div v-if="!isDataReady" class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mb-4"></div>
      <p class="text-gray-600 dark:text-gray-400">Cargando...</p>
    </div>
  </div>

  <!-- Main dashboard - only show when data is ready -->
  <div v-else class="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0">
    <div class="container mx-auto px-4 py-6">
      <!-- Header -->
      <AppHeader />

      <!-- Dashboard Content -->
    <!-- Dashboard Content -->
      <ClientOnly>
        <!-- Error State -->
        <div v-if="expenseStore.error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
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

            <!-- My Recent Activity -->
            <ExpenseList
              :items="myRecentActivity"
              :current-user-id="currentUserId"
              title="Tu Actividad Reciente"
              show-user-share
              show-add-button
              empty-message="No tenes actividad aun"
              @add-expense="openExpenseModal"
              @edit-expense="handleEditExpense"
              @delete-expense="confirmDeleteExpense"
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

            <!-- Balance List -->
            <BalanceList
              :balances="sortedBalances"
              :current-user-id="currentUserId"
            />

            <!-- Settlement List -->
            <SettlementList
              :settlements="currentSettlements"
              :simplified="useSimplifiedSettlements"
              @toggle-simplify="toggleSimplify"
            />

            <!-- All Group Activity -->
            <ExpenseList
              :items="groupActivity"
              :current-user-id="currentUserId"
              title="Actividad del Grupo"
              show-count
              :limit="10"
              @edit-expense="handleEditExpense"
              @delete-expense="confirmDeleteExpense"
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

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="Eliminar Gasto"
      :message="deleteConfirmMessage"
      confirm-text="Eliminar"
      cancel-text="Cancelar"
      variant="danger"
      @confirm="handleDeleteExpense"
    />
  </div>
</template>

<script setup>
definePageMeta({
  middleware: ['auth'],
  ssr: false  // Disable SSR - Firebase auth only works on client
})

const { firestoreUser } = useAuth()
const expenseStore = useExpenseStore()
const paymentStore = usePaymentStore()
const userStore = useUserStore()
const groupStore = useGroupStore()
const { activeTab, openExpenseModal, openEditExpenseModal } = useNavigationState()

// Start with loading = true, only set to false when we KNOW data is ready
// This prevents any flash of empty content during hydration
const isDataReady = ref(false)

// Watch for when all data is actually ready
watchEffect(() => {
  const hasGroup = !!groupStore.selectedGroupId
  const groupsReady = !groupStore.loading
  const expensesReady = expenseStore.initialized && !expenseStore.loading
  const paymentsReady = paymentStore.initialized && !paymentStore.loading
  const usersReady = !userStore.loading && userStore.users.length > 0

  // Wait for EVERYTHING to be ready (including payments for settlement calculations)
  if (hasGroup && groupsReady && expensesReady && paymentsReady && usersReady) {
    isDataReady.value = true
  } else {
    // Optional: Only set back to false if group changes, to avoid flickering on subsequent soft-reloads?
    // For now, strict strict sync to avoid "empty" states is safer for the user's request.
    isDataReady.value = false
  }
})

// Current user ID
const currentUserId = computed(() => firestoreUser.value?.id || '')

// Balance calculations
// Force reactive dependency on payments and expenses so Vue re-runs these when data changes
const sortedBalances = computed(() => {
  // Touch reactive arrays to establish dependency
  void paymentStore.payments.length
  void expenseStore.expenses.length
  return userStore.getSortedBalances()
})
const settlements = computed(() => {
  // Touch reactive arrays to establish dependency
  void paymentStore.payments.length
  void expenseStore.expenses.length
  return userStore.calculateSettlements()
})

// Simplified settlements toggle (group-level setting)
const useSimplifiedSettlements = computed(() => groupStore.simplifySettlements)

const currentSettlements = computed(() => {
  // Touch reactive arrays to establish dependency
  void paymentStore.payments.length
  void expenseStore.expenses.length
  return useSimplifiedSettlements.value
    ? userStore.calculateSimplifiedSettlements()
    : userStore.calculateSettlements()
})

const toggleSimplify = async () => {
  await groupStore.toggleSimplifySettlements()
}

// Personal balance (for Inicio tab)
const myBalance = computed(() => {
  // Touch reactive arrays to establish dependency
  void paymentStore.payments.length
  void expenseStore.expenses.length
  const balances = userStore.calculateBalances()
  const myBalanceData = balances.find(b => b.userId === currentUserId.value)
  return myBalanceData?.net || 0
})

// My debts (settlements where I owe someone)
const myDebts = computed(() => {
  return settlements.value.filter(s => s.fromUserId === currentUserId.value)
})

// My credits (settlements where someone owes me)
const myCredits = computed(() => {
  return settlements.value.filter(s => s.toUserId === currentUserId.value)
})

// Unified activity list (expenses + payments)
const groupActivity = computed(() => {
  const expenses = expenseStore.expenses
  const payments = paymentStore.payments

  // Combine and sort by date descending
  const allItems = [...expenses, ...payments]
  return allItems.sort((a, b) => {
    const dateA = 'timestamp' in a ? new Date(a.timestamp) : new Date(a.createdAt)
    const dateB = 'timestamp' in b ? new Date(b.timestamp) : new Date(b.createdAt)
    return dateB.getTime() - dateA.getTime()
  })
})

const myRecentActivity = computed(() => {
  // Filter expenses involving me
  const expenses = expenseStore.expenses.filter(expense => {
    if (expense.userId === currentUserId.value) return true
    if (!expense.splitAmong || expense.splitAmong.length === 0) return true
    return expense.splitAmong.includes(currentUserId.value)
  })

  // Filter payments involving me
  const payments = paymentStore.payments.filter(payment => {
    return payment.fromUserId === currentUserId.value || payment.toUserId === currentUserId.value
  })

  // Combine and sort
  const allItems = [...expenses, ...payments]
  return allItems.sort((a, b) => {
    const dateA = 'timestamp' in a ? new Date(a.timestamp) : new Date(a.createdAt)
    const dateB = 'timestamp' in b ? new Date(b.timestamp) : new Date(b.createdAt)
    return dateB.getTime() - dateA.getTime()
  }).slice(0, 10)
})

// Payment info modal
const showPaymentModal = ref(false)
const paymentModalUser = ref(null)

const showPaymentInfo = (userId) => {
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

// Delete expense
const showDeleteConfirm = ref(false)
const expenseToDelete = ref(null)

const deleteConfirmMessage = computed(() => {
  if (!expenseToDelete.value) return ''
  return `¿Estas seguro de que queres eliminar "${expenseToDelete.value.description}" por ${formatCurrency(expenseToDelete.value.amount)}? Esta accion no se puede deshacer.`
})

const confirmDeleteExpense = (expense) => {
  expenseToDelete.value = expense
  showDeleteConfirm.value = true
}

const handleDeleteExpense = async () => {
  if (!expenseToDelete.value?.id) return

  try {
    await expenseStore.deleteExpense(expenseToDelete.value.id)
  } catch (error) {
    console.error('Error deleting expense:', error)
  } finally {
    expenseToDelete.value = null
  }
}

// Edit expense
const handleEditExpense = (expense) => {
  openEditExpenseModal(expense)
}
</script>
