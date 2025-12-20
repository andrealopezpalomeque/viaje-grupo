<template>
  <div v-if="hasActiveFilters" class="flex flex-wrap items-center gap-2">
    <!-- Person Filter Chip -->
    <div
      v-if="filterByPerson"
      class="flex items-center gap-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2.5 py-1 rounded-full text-xs font-medium"
    >
      <IconUser class="w-3.5 h-3.5" />
      <span>{{ getPersonName(filterByPerson) }}</span>
      <button
        @click="clearPersonFilter"
        class="hover:text-blue-600 dark:hover:text-blue-200 transition-colors"
      >
        <IconClose class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Payer Filter Chip -->
    <div
      v-if="filterByPayer !== 'all'"
      class="flex items-center gap-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-2.5 py-1 rounded-full text-xs font-medium"
    >
      <IconCash class="w-3.5 h-3.5" />
      <span>{{ payerFilterLabel }}</span>
      <button
        @click="clearPayerFilter"
        class="hover:text-purple-600 dark:hover:text-purple-200 transition-colors"
      >
        <IconClose class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconUser from '~icons/mdi/account'
import IconCash from '~icons/mdi/cash'
import IconClose from '~icons/mdi/close'

const userStore = useUserStore()
const { filterByPerson, filterByPayer, hasActiveFilters, setPersonFilter, setPayerFilter } = useExpenseFilters()

const getPersonName = (personId: string) => {
  return userStore.getUserById(personId)?.name || 'Usuario'
}

const payerFilterLabel = computed(() => {
  return {
    me: 'Pague yo',
    others: 'Pagaron otros',
    all: ''
  }[filterByPayer.value]
})

const clearPersonFilter = () => {
  setPersonFilter(null)
}

const clearPayerFilter = () => {
  setPayerFilter('all')
}
</script>
