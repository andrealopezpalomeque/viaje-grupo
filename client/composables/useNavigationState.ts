export type TabType = 'inicio' | 'grupo'

export const useNavigationState = () => {
  const activeTab = useState<TabType>('nav-active-tab', () => 'inicio')
  const isExpenseModalOpen = useState<boolean>('expense-modal-open', () => false)

  const switchTab = (tab: TabType) => {
    activeTab.value = tab
  }

  const openExpenseModal = () => {
    isExpenseModalOpen.value = true
  }

  const closeExpenseModal = () => {
    isExpenseModalOpen.value = false
  }

  return {
    activeTab: readonly(activeTab),
    isExpenseModalOpen: readonly(isExpenseModalOpen),
    switchTab,
    openExpenseModal,
    closeExpenseModal
  }
}
