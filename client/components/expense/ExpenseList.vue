<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
    <!-- Header -->
    <div class="px-3 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
      <IconClipboardList class="w-5 h-5 text-gray-500 dark:text-gray-400" />
      <h3 class="text-base font-semibold text-gray-900 dark:text-white">
        {{ title }}
      </h3>
      <span
        v-if="showCount"
        class="text-xs text-gray-500 dark:text-gray-400 ml-auto"
      >
        {{ expenses.length }} {{ expenses.length === 1 ? 'gasto' : 'gastos' }}
      </span>
    </div>

    <!-- Empty State -->
    <div v-if="expenses.length === 0" class="p-8 text-center">
      <div class="w-14 h-14 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
        <IconReceipt class="w-7 h-7 text-gray-400" />
      </div>
      <p class="text-gray-600 dark:text-gray-400 text-sm">
        {{ emptyMessage }}
      </p>
      <button
        v-if="showAddButton"
        @click="$emit('addExpense')"
        class="mt-3 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm"
      >
        Agregar el primero
      </button>
    </div>

    <!-- Expense List -->
    <div v-else class="divide-y divide-gray-100 dark:divide-gray-700">
      <ExpenseItem
        v-for="expense in displayedExpenses"
        :key="expense.id"
        :expense="expense"
        :current-user-id="currentUserId"
        :show-user-share="showUserShare"
      />
    </div>

    <!-- Show More Button -->
    <div
      v-if="hasMore"
      class="px-3 py-3 border-t border-gray-100 dark:border-gray-700"
    >
      <button
        @click="showAll = !showAll"
        class="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
      >
        {{ showAll ? 'Ver menos' : `Ver todos (${expenses.length})` }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconClipboardList from '~icons/mdi/clipboard-text-clock'
import IconReceipt from '~icons/mdi/receipt-text-outline'

import type { Expense } from '~/types'

interface Props {
  expenses: Expense[]
  title?: string
  currentUserId?: string
  showUserShare?: boolean
  showCount?: boolean
  showAddButton?: boolean
  emptyMessage?: string
  limit?: number
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Gastos',
  currentUserId: '',
  showUserShare: false,
  showCount: false,
  showAddButton: false,
  emptyMessage: 'No hay gastos',
  limit: 5
})

defineEmits<{
  (e: 'addExpense'): void
}>()

const showAll = ref(false)

const hasMore = computed(() => {
  return props.expenses.length > props.limit
})

const displayedExpenses = computed(() => {
  if (showAll.value || !hasMore.value) {
    return props.expenses
  }
  return props.expenses.slice(0, props.limit)
})
</script>
