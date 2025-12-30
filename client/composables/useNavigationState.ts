import type { Expense } from '~/types'

export type TabType = 'inicio' | 'grupo'
export type ExpenseModalMode = 'create' | 'edit'

export const useNavigationState = () => {
  const activeTab = useState<TabType>('nav-active-tab', () => 'inicio')
  const isExpenseModalOpen = useState<boolean>('expense-modal-open', () => false)
  const expenseModalMode = useState<ExpenseModalMode>('expense-modal-mode', () => 'create')
  const expenseToEdit = useState<Expense | null>('expense-to-edit', () => null)

  const switchTab = (tab: TabType) => {
    activeTab.value = tab
  }

  const openExpenseModal = () => {
    expenseModalMode.value = 'create'
    expenseToEdit.value = null
    isExpenseModalOpen.value = true
  }

  const openEditExpenseModal = (expense: Expense) => {
    expenseModalMode.value = 'edit'
    expenseToEdit.value = expense
    isExpenseModalOpen.value = true
  }

  const closeExpenseModal = () => {
    isExpenseModalOpen.value = false
    expenseModalMode.value = 'create'
    expenseToEdit.value = null
  }

  return {
    activeTab: readonly(activeTab),
    isExpenseModalOpen: readonly(isExpenseModalOpen),
    expenseModalMode: readonly(expenseModalMode),
    expenseToEdit: readonly(expenseToEdit),
    switchTab,
    openExpenseModal,
    openEditExpenseModal,
    closeExpenseModal
  }
}
