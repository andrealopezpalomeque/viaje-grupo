<template>
  <!-- Loading state -->
  <div v-if="loading" class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mb-4"></div>
      <p class="text-gray-600 dark:text-gray-400">Cargando reporte...</p>
    </div>
  </div>

  <!-- Empty state -->
  <div v-else-if="expenses.length === 0" class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <div class="text-center px-4">
      <div class="text-6xl mb-4">📊</div>
      <p class="text-gray-500 dark:text-gray-400 mb-4">No hay gastos registrados todavia</p>
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
      >
        Volver al inicio
      </NuxtLink>
    </div>
  </div>

  <!-- Report content -->
  <div v-else class="min-h-screen bg-gray-50 dark:bg-gray-900 pb-8">
    <div class="container mx-auto px-4 py-6 max-w-2xl">

      <!-- Section 1: Trip Header -->
      <div class="mb-6">
        <NuxtLink
          to="/?tab=grupo"
          class="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
        >
          <IconChevronLeft class="w-4 h-4" />
          Volver
        </NuxtLink>

        <div class="text-center">
          <div class="text-4xl mb-2">🏖️</div>
          <h1 class="text-2xl font-display font-bold text-gray-900 dark:text-white mb-1">
            {{ groupName }}
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mb-2">
            {{ formatDateRange(firstExpenseDate, lastExpenseDate) }}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-500">
            {{ tripDays }} dias · {{ memberCount }} personas · {{ expenseCount }} gastos
          </p>
        </div>
      </div>

      <!-- Section 2: General Summary Card -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 mb-4">
        <h2 class="flex items-center gap-2 text-lg font-display font-semibold text-gray-900 dark:text-white mb-4">
          <span>💰</span>
          Resumen General
        </h2>

        <div class="space-y-3">
          <div class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
            <span class="text-gray-600 dark:text-gray-400">Total gastado</span>
            <span class="font-mono font-semibold text-gray-900 dark:text-white">{{ formatCurrency(totalSpent) }}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
            <span class="text-gray-600 dark:text-gray-400">Promedio por persona</span>
            <span class="font-mono text-gray-900 dark:text-white">{{ formatCurrency(avgPerPerson) }}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
            <span class="text-gray-600 dark:text-gray-400">Promedio por dia</span>
            <span class="font-mono text-gray-900 dark:text-white">{{ formatCurrency(avgPerDay) }}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
            <span class="text-gray-600 dark:text-gray-400">Gasto promedio</span>
            <span class="font-mono text-gray-900 dark:text-white">{{ formatCurrency(avgPerExpense) }}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
            <span class="text-gray-600 dark:text-gray-400">Total de gastos</span>
            <span class="font-mono text-gray-900 dark:text-white">{{ expenseCount }}</span>
          </div>
          <div class="flex justify-between items-center py-2">
            <span class="text-gray-600 dark:text-gray-400">Total de pagos registrados</span>
            <span class="font-mono text-gray-900 dark:text-white">{{ paymentCount }}</span>
          </div>
        </div>
      </div>

      <!-- Section 3: Category Breakdown Card -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 mb-4">
        <h2 class="flex items-center gap-2 text-lg font-display font-semibold text-gray-900 dark:text-white mb-4">
          <span>📊</span>
          Gastos por Categoria
        </h2>

        <div class="space-y-4">
          <div v-for="cat in categoryStats" :key="cat.category" class="space-y-1">
            <div class="flex items-center gap-2">
              <CategoryIcon :category="cat.category" size="sm" />
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                {{ getCategoryLabel(cat.category) }}
              </span>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="getCategoryBarColor(cat.category)"
                  :style="{ width: cat.percentage + '%' }"
                />
              </div>
              <span class="font-mono text-sm text-gray-900 dark:text-white whitespace-nowrap">
                {{ formatCurrency(cat.total) }}
              </span>
              <span class="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">
                {{ Math.round(cat.percentage) }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 4: Spending Per Person Card -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 mb-4">
        <h2 class="flex items-center gap-2 text-lg font-display font-semibold text-gray-900 dark:text-white mb-4">
          <span>👥</span>
          Quien Pago Mas
        </h2>

        <div class="space-y-4">
          <div v-for="(person, index) in personSpending" :key="person.userId" class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-gray-500 dark:text-gray-400 w-5">{{ index + 1 }}.</span>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ person.userName }}
              </span>
            </div>
            <div class="flex items-center gap-3 pl-7">
              <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-indigo-500"
                  :style="{ width: person.percentage + '%' }"
                />
              </div>
              <span class="font-mono text-sm text-gray-900 dark:text-white whitespace-nowrap">
                {{ formatCurrency(person.totalPaid) }}
              </span>
              <span class="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">
                {{ Math.round(person.percentage) }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 5: Daily Spending Chart -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 mb-4">
        <h2 class="flex items-center gap-2 text-lg font-display font-semibold text-gray-900 dark:text-white mb-4">
          <span>📅</span>
          Gasto por Dia
        </h2>

        <div class="overflow-x-auto -mx-2 px-2">
          <div
            class="flex items-end gap-1 h-40 pb-6 relative"
            :style="{ minWidth: dailySpending.length > 10 ? (dailySpending.length * 40) + 'px' : 'auto' }"
          >
            <div
              v-for="day in dailySpending"
              :key="day.dateKey"
              class="flex flex-col items-center flex-1"
              :style="{ minWidth: dailySpending.length > 15 ? '32px' : '40px' }"
            >
              <!-- Bar -->
              <div
                class="w-full bg-gradient-to-t from-blue-500 to-indigo-400 dark:from-blue-400 dark:to-indigo-300 rounded-t-sm min-h-[2px] transition-all duration-500 cursor-pointer hover:opacity-80"
                :style="{ height: getBarHeight(day.total) + '%' }"
                :title="formatCurrency(day.total)"
              />
              <!-- Date label -->
              <span class="text-[10px] text-gray-500 dark:text-gray-400 mt-1 whitespace-nowrap">
                {{ formatShortDate(day.date) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Y-axis legend -->
        <div class="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-2 px-2">
          <span>Max: {{ formatCurrency(maxDailySpend) }}</span>
          <span>Promedio: {{ formatCurrency(avgDailySpend) }}</span>
        </div>
      </div>

      <!-- Section 6: Highlights Card -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 mb-4">
        <h2 class="flex items-center gap-2 text-lg font-display font-semibold text-gray-900 dark:text-white mb-4">
          <span>🏆</span>
          Highlights
        </h2>

        <div class="space-y-4">
          <!-- Biggest expense -->
          <div v-if="biggestExpense" class="flex items-start gap-3">
            <span class="text-xl">💸</span>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Gasto mas grande</p>
              <p class="font-mono text-gray-900 dark:text-white">
                {{ formatCurrency(biggestExpense.amount) }} - {{ biggestExpense.description }}
                <span class="text-gray-500 dark:text-gray-400">({{ biggestExpense.userName }})</span>
              </p>
            </div>
          </div>

          <!-- Most expensive day -->
          <div v-if="mostExpensiveDay" class="flex items-start gap-3">
            <span class="text-xl">📅</span>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Dia mas caro</p>
              <p class="font-mono text-gray-900 dark:text-white">
                {{ formatFullDate(mostExpensiveDay.date) }} - {{ formatCurrency(mostExpensiveDay.total) }}
              </p>
            </div>
          </div>

          <!-- Cheapest day -->
          <div v-if="cheapestDay" class="flex items-start gap-3">
            <span class="text-xl">💰</span>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Dia mas barato</p>
              <p class="font-mono text-gray-900 dark:text-white">
                {{ formatFullDate(cheapestDay.date) }} - {{ formatCurrency(cheapestDay.total) }}
              </p>
            </div>
          </div>

          <!-- Top category -->
          <div v-if="topCategory" class="flex items-start gap-3">
            <span class="text-xl">🏷️</span>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Categoria favorita</p>
              <p class="flex items-center gap-2 text-gray-900 dark:text-white">
                <CategoryIcon :category="topCategory.category" size="sm" />
                <span class="capitalize">{{ getCategoryLabel(topCategory.category) }}</span>
                <span class="text-gray-500 dark:text-gray-400">({{ Math.round(topCategory.percentage) }}% del total)</span>
              </p>
            </div>
          </div>

          <!-- Most active user -->
          <div v-if="mostActiveUser" class="flex items-start gap-3">
            <span class="text-xl">🧾</span>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Mas gastos registrados</p>
              <p class="text-gray-900 dark:text-white">
                {{ mostActiveUser.userName }} <span class="text-gray-500 dark:text-gray-400">({{ mostActiveUser.expenseCount }} gastos)</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 7: Debt Status Card -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
        <h2 class="flex items-center gap-2 text-lg font-display font-semibold text-gray-900 dark:text-white mb-4">
          <span>{{ allSettled ? '✅' : '📋' }}</span>
          Estado de Deudas
        </h2>

        <!-- All settled -->
        <div v-if="allSettled" class="text-center py-4">
          <div class="text-4xl mb-2">🎉</div>
          <p class="text-green-600 dark:text-green-400 font-medium">
            ¡Todas las deudas estan saldadas!
          </p>
        </div>

        <!-- Pending settlements -->
        <div v-else class="space-y-3">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Pendientes: {{ settlements.length }}
          </p>

          <div class="space-y-2">
            <div
              v-for="settlement in settlements.slice(0, 5)"
              :key="`${settlement.fromUserId}-${settlement.toUserId}`"
              class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <div class="flex items-center gap-2 text-sm">
                <span class="text-gray-700 dark:text-gray-300">{{ getUserName(settlement.fromUserId) }}</span>
                <span class="text-gray-400">→</span>
                <span class="text-gray-700 dark:text-gray-300">{{ getUserName(settlement.toUserId) }}</span>
              </div>
              <span class="font-mono text-sm text-gray-900 dark:text-white">
                {{ formatCurrency(settlement.amount) }}
              </span>
            </div>
          </div>

          <div v-if="settlements.length > 5" class="text-sm text-gray-500 dark:text-gray-400 text-center">
            y {{ settlements.length - 5 }} mas...
          </div>

          <div class="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Total pendiente</span>
            <span class="font-mono font-semibold text-gray-900 dark:text-white">
              {{ formatCurrency(totalPending) }}
            </span>
          </div>

          <NuxtLink
            to="/?tab=grupo"
            class="w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Ver en Grupo
          </NuxtLink>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import IconChevronLeft from '~icons/mdi/chevron-left'
import type { Settlement } from '~/types'

definePageMeta({
  middleware: ['auth'],
  ssr: false
})

const expenseStore = useExpenseStore()
const paymentStore = usePaymentStore()
const userStore = useUserStore()
const groupStore = useGroupStore()

// Data is initialized globally in app.vue when authenticated
// This page just needs to wait for the data to be ready

// Loading state
const loading = computed(() => {
  return expenseStore.loading || !expenseStore.initialized || !groupStore.selectedGroupId
})

// Basic data
const expenses = computed(() => expenseStore.expenses)
const groupName = computed(() => groupStore.selectedGroup?.name || 'Viaje')
const memberCount = computed(() => userStore.users.length)
const expenseCount = computed(() => expenses.value.length)
const paymentCount = computed(() => paymentStore.payments.length)

// Trip dates (auto-detected from expenses)
const firstExpenseDate = computed(() => {
  if (expenses.value.length === 0) return new Date()
  const dates = expenses.value.map(e => new Date(e.timestamp).getTime())
  return new Date(Math.min(...dates))
})

const lastExpenseDate = computed(() => {
  if (expenses.value.length === 0) return new Date()
  const dates = expenses.value.map(e => new Date(e.timestamp).getTime())
  return new Date(Math.max(...dates))
})

const tripDays = computed(() => {
  const diffTime = Math.abs(lastExpenseDate.value.getTime() - firstExpenseDate.value.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(diffDays + 1, 1) // inclusive, minimum 1 day
})

// General stats
const totalSpent = computed(() => expenseStore.totalSpent)

const avgPerPerson = computed(() => {
  if (memberCount.value === 0) return 0
  return totalSpent.value / memberCount.value
})

const avgPerDay = computed(() => {
  if (tripDays.value === 0) return 0
  return totalSpent.value / tripDays.value
})

const avgPerExpense = computed(() => {
  if (expenseCount.value === 0) return 0
  return totalSpent.value / expenseCount.value
})

// Category breakdown
const categoryStats = computed(() => {
  const breakdown = expenseStore.categoryBreakdown
  return breakdown.map(cat => ({
    ...cat,
    percentage: totalSpent.value > 0 ? (cat.total / totalSpent.value) * 100 : 0
  }))
})

const topCategory = computed(() => {
  return categoryStats.value[0] || null
})

// Per-person spending (who PAID)
const personSpending = computed(() => {
  const byUser = new Map<string, { userId: string; userName: string; totalPaid: number; expenseCount: number }>()

  expenses.value.forEach(expense => {
    const existing = byUser.get(expense.userId)
    if (existing) {
      existing.totalPaid += expense.amount
      existing.expenseCount += 1
    } else {
      byUser.set(expense.userId, {
        userId: expense.userId,
        userName: expense.userName,
        totalPaid: expense.amount,
        expenseCount: 1
      })
    }
  })

  const sorted = Array.from(byUser.values()).sort((a, b) => b.totalPaid - a.totalPaid)
  return sorted.map(person => ({
    ...person,
    percentage: totalSpent.value > 0 ? (person.totalPaid / totalSpent.value) * 100 : 0
  }))
})

const mostActiveUser = computed(() => {
  if (personSpending.value.length === 0) return null
  return [...personSpending.value].sort((a, b) => b.expenseCount - a.expenseCount)[0]
})

// Daily spending
const dailySpending = computed(() => {
  const byDate = new Map<string, { dateKey: string; date: Date; total: number; count: number }>()

  expenses.value.forEach(expense => {
    const date = new Date(expense.timestamp)
    const dateKey = date.toISOString().split('T')[0] ?? ''

    const existing = byDate.get(dateKey)
    if (existing) {
      existing.total += expense.amount
      existing.count += 1
    } else {
      byDate.set(dateKey, {
        dateKey,
        date,
        total: expense.amount,
        count: 1
      })
    }
  })

  return Array.from(byDate.values()).sort((a, b) =>
    new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime()
  )
})

const maxDailySpend = computed(() => {
  if (dailySpending.value.length === 0) return 0
  return Math.max(...dailySpending.value.map(d => d.total))
})

const avgDailySpend = computed(() => {
  if (dailySpending.value.length === 0) return 0
  const total = dailySpending.value.reduce((sum, d) => sum + d.total, 0)
  return total / dailySpending.value.length
})

const getBarHeight = (total: number): number => {
  if (maxDailySpend.value === 0) return 0
  return (total / maxDailySpend.value) * 100
}

// Highlights
const biggestExpense = computed(() => {
  if (expenses.value.length === 0) return null
  return [...expenses.value].sort((a, b) => b.amount - a.amount)[0]
})

const mostExpensiveDay = computed(() => {
  if (dailySpending.value.length === 0) return null
  return [...dailySpending.value].sort((a, b) => b.total - a.total)[0]
})

const cheapestDay = computed(() => {
  if (dailySpending.value.length === 0) return null
  return [...dailySpending.value].sort((a, b) => a.total - b.total)[0]
})

// Debt status
const settlements = computed((): Settlement[] => {
  // Touch reactive arrays for dependency
  void paymentStore.payments.length
  void expenseStore.expenses.length

  return groupStore.simplifySettlements
    ? userStore.calculateSimplifiedSettlements()
    : userStore.calculateSettlements()
})

const allSettled = computed(() => settlements.value.length === 0)

const totalPending = computed(() => {
  return settlements.value.reduce((sum, s) => sum + s.amount, 0)
})

const getUserName = (userId: string): string => {
  const user = userStore.getUserById(userId)
  return user?.name?.split(' ')[0] || 'Usuario'
}

// Category helpers
const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    food: 'Comida',
    transport: 'Transporte',
    accommodation: 'Alojamiento',
    entertainment: 'Entretenimiento',
    shopping: 'Compras',
    general: 'General'
  }
  return labels[category] || category
}

const getCategoryBarColor = (category: string): string => {
  const colors: Record<string, string> = {
    food: 'bg-orange-500',
    transport: 'bg-blue-500',
    accommodation: 'bg-purple-500',
    entertainment: 'bg-pink-500',
    shopping: 'bg-emerald-500',
    general: 'bg-gray-500'
  }
  return colors[category] || 'bg-gray-500'
}

// Date formatting
const formatDateRange = (start: Date, end: Date): string => {
  const formatOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }
  const startStr = start.toLocaleDateString('es-AR', formatOptions)
  const endStr = end.toLocaleDateString('es-AR', formatOptions)

  if (startStr === endStr) return startStr
  return `${startStr} – ${endStr}`
}

const formatShortDate = (date: Date): string => {
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

const formatFullDate = (date: Date): string => {
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}
</script>
