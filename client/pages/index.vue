<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <header class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          ViajeGrupo
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          Seguimiento de gastos del viaje
        </p>
      </header>

      <!-- Loading State -->
      <div v-if="expenseStore.loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
        <p class="mt-4 text-gray-600 dark:text-gray-400">Cargando gastos...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="expenseStore.error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p class="text-red-800 dark:text-red-200">{{ expenseStore.error }}</p>
      </div>

      <!-- Dashboard -->
      <div v-else>
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <!-- Total Spent -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">
              Gasto Total
            </h3>
            <p class="text-3xl font-bold text-gray-900 dark:text-white mt-2 font-mono tabular-nums">
              {{ formatCurrency(expenseStore.totalSpent) }}
            </p>
          </div>

          <!-- Total Expenses -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total de Gastos
            </h3>
            <p class="text-3xl font-bold text-gray-900 dark:text-white mt-2 font-mono tabular-nums">
              {{ expenseStore.expenses.length }}
            </p>
          </div>

          <!-- Average per Person -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">
              Promedio por Persona
            </h3>
            <p class="text-3xl font-bold text-gray-900 dark:text-white mt-2 font-mono tabular-nums">
              {{ formatCurrency(expenseStore.totalSpent / 11) }}
            </p>
          </div>
        </div>

        <!-- Recent Expenses -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              Actividad Reciente
            </h2>
          </div>

          <div v-if="expenseStore.expenses.length === 0" class="p-6 text-center text-gray-500 dark:text-gray-400">
            No hay gastos registrados aún
          </div>

          <div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
            <div
              v-for="expense in expenseStore.recentExpenses"
              :key="expense.id"
              class="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {{ userStore.getUserInitials(expense.userId) }}
                      </span>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ expense.userName }}
                      </p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ expense.description }}
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {{ formatRelativeTime(expense.timestamp) }}
                      </p>
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-lg font-semibold text-gray-900 dark:text-white font-mono tabular-nums">
                    {{ formatCurrency(expense.amount) }}
                  </p>
                  <span
                    class="inline-block px-2 py-1 text-xs rounded-full mt-1"
                    :class="getCategoryColor(expense.category)"
                  >
                    {{ getCategoryLabel(expense.category) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Balances -->
        <div class="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              ¿Quién debe?
            </h2>
          </div>

          <div class="divide-y divide-gray-200 dark:divide-gray-700">
            <div
              v-for="balance in sortedBalances"
              :key="balance.userId"
              class="px-6 py-4"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {{ userStore.getUserInitials(balance.userId) }}
                    </span>
                  </div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ userStore.getUserById(balance.userId)?.name }}
                  </p>
                </div>
                <div class="text-right">
                  <p
                    class="text-lg font-semibold font-mono tabular-nums"
                    :class="{
                      'text-positive-600 dark:text-positive-400': balance.net > 0,
                      'text-negative-600 dark:text-negative-400': balance.net < 0,
                      'text-gray-600 dark:text-gray-400': balance.net === 0
                    }"
                  >
                    {{ formatCurrency(Math.abs(balance.net)) }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    <span v-if="balance.net > 0">Le deben</span>
                    <span v-else-if="balance.net < 0">Debe</span>
                    <span v-else>Al día</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ExpenseCategory } from '~/types'

const expenseStore = useExpenseStore()
const userStore = useUserStore()

const sortedBalances = computed(() => userStore.getSortedBalances())

const getCategoryLabel = (category: ExpenseCategory): string => {
  const labels: Record<ExpenseCategory, string> = {
    food: 'Comida',
    transport: 'Transporte',
    accommodation: 'Alojamiento',
    entertainment: 'Entretenimiento',
    general: 'General'
  }
  return labels[category]
}

const getCategoryColor = (category: ExpenseCategory): string => {
  const colors: Record<ExpenseCategory, string> = {
    food: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    transport: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    accommodation: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    entertainment: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
    general: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
  }
  return colors[category]
}
</script>
