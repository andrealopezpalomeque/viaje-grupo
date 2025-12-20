<template>
  <div class="flex flex-wrap items-center gap-2">
    <!-- Person Filter -->
    <div class="relative">
      <select
        :value="filterByPerson ?? ''"
        @change="handlePersonChange"
        class="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
      >
        <option value="">Todas las personas</option>
        <option
          v-for="user in users"
          :key="user.id"
          :value="user.id"
        >
          {{ user.name }}
        </option>
      </select>
      <IconChevronDown class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>

    <!-- Payer Filter -->
    <div class="relative">
      <select
        :value="filterByPayer"
        @change="handlePayerChange"
        class="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
      >
        <option value="all">Pagado por todos</option>
        <option value="me">Pague yo</option>
        <option value="others">Pagaron otros</option>
      </select>
      <IconChevronDown class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>

    <!-- Clear Filters -->
    <button
      v-if="hasActiveFilters"
      @click="clearFilters"
      class="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
    >
      <IconClose class="w-4 h-4" />
      Limpiar
    </button>
  </div>
</template>

<script setup lang="ts">
import IconChevronDown from '~icons/mdi/chevron-down'
import IconClose from '~icons/mdi/close'

import type { PayerFilter } from '~/composables/useExpenseFilters'

const userStore = useUserStore()
const { filterByPerson, filterByPayer, hasActiveFilters, setPersonFilter, setPayerFilter, clearFilters } = useExpenseFilters()

const users = computed(() => userStore.users)

const handlePersonChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  setPersonFilter(target.value || null)
}

const handlePayerChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  setPayerFilter(target.value as PayerFilter)
}
</script>
