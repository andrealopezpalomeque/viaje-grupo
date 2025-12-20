export type PayerFilter = 'all' | 'me' | 'others'

export const useExpenseFilters = () => {
  const filterByPerson = useState<string | null>('expense-filter-person', () => null)
  const filterByPayer = useState<PayerFilter>('expense-filter-payer', () => 'all')

  const hasActiveFilters = computed(() => {
    return filterByPerson.value !== null || filterByPayer.value !== 'all'
  })

  const setPersonFilter = (personId: string | null) => {
    filterByPerson.value = personId
  }

  const setPayerFilter = (filter: PayerFilter) => {
    filterByPayer.value = filter
  }

  const clearFilters = () => {
    filterByPerson.value = null
    filterByPayer.value = 'all'
  }

  return {
    filterByPerson: readonly(filterByPerson),
    filterByPayer: readonly(filterByPayer),
    hasActiveFilters,
    setPersonFilter,
    setPayerFilter,
    clearFilters
  }
}
