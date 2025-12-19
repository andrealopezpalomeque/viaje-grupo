<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <header class="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            ViajeGrupo
          </h1>
          <!-- Group Selector -->
          <div class="mt-2 flex items-center gap-2">
            <svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <select
              v-if="groupStore.hasMultipleGroups"
              :value="groupStore.selectedGroupId"
              @change="handleGroupChange"
              class="bg-transparent border-none text-gray-700 dark:text-gray-300 text-sm font-medium focus:ring-0 focus:outline-none cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <option
                v-for="group in groupStore.groups"
                :key="group.id"
                :value="group.id"
                class="bg-white dark:bg-gray-800"
              >
                {{ group.name }}
              </option>
            </select>
            <span
              v-else
              class="text-gray-700 dark:text-gray-300 text-sm font-medium"
            >
              {{ groupStore.selectedGroup?.name || 'Cargando...' }}
            </span>
          </div>
        </div>

        <!-- User Profile & Navigation -->
        <div v-if="user" class="flex items-center gap-2 sm:gap-4">
          <!-- Profile Link -->
          <NuxtLink
            to="/profile"
            class="flex items-center gap-2 sm:gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg px-2 py-1 sm:px-3 sm:py-2 transition-colors"
          >
            <img
              v-if="user.photoURL"
              :src="user.photoURL"
              :alt="user.displayName || 'User'"
              class="w-8 h-8 sm:w-10 sm:h-10 rounded-full ring-2 ring-gray-200 dark:ring-gray-700"
            />
            <div
              v-else
              class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center"
            >
              <span class="text-white font-medium text-xs sm:text-sm">
                {{ getUserInitials(user.displayName) }}
              </span>
            </div>
            <div class="hidden md:block">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ user.displayName }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Mi perfil
              </p>
            </div>
          </NuxtLink>
          <!-- Logout Button -->
          <button
            @click="handleSignOut"
            class="px-3 py-2 sm:px-4 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Cerrar sesión"
          >
            <span class="hidden sm:inline">Salir</span>
            <svg class="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
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
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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

        </div>

        <!-- Add Expense Button -->
        <div class="mb-6">
          <button
            @click="openExpenseModal"
            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Agregar gasto
          </button>
        </div>

        <!-- Recent Expenses -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              Actividad Reciente
            </h2>
          </div>

          <div v-if="expenseStore.expenses.length === 0" class="p-8 text-center">
            <div class="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p class="text-gray-600 dark:text-gray-400 mb-2">No hay gastos todavía</p>
            <button
              @click="openExpenseModal"
              class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              ¡Agregá el primero!
            </button>
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
                        {{ userStore.getUserInitials(expense.userId, expense.userName) }}
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
                  <p
                    v-if="expense.originalCurrency && expense.originalCurrency !== 'ARS'"
                    class="text-xs text-gray-500 dark:text-gray-400"
                  >
                    {{ formatCurrencyByCode(expense.originalAmount ?? 0, expense.originalCurrency) }} ingresados
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

        <!-- Balances and Settlements Grid -->
        <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Balances -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
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

          <!-- Settlements -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                Para saldar deudas
              </h2>
            </div>

            <div v-if="settlements.length === 0" class="p-6 text-center text-gray-500 dark:text-gray-400">
              <p>No hay deudas pendientes</p>
            </div>

            <div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
              <div
                v-for="(settlement, index) in settlements"
                :key="index"
                class="px-6 py-4"
              >
                <div class="flex items-center gap-3">
                  <!-- From user (debtor) -->
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <span class="text-xs font-medium text-red-700 dark:text-red-400">
                        {{ userStore.getUserInitials(settlement.fromUserId) }}
                      </span>
                    </div>
                    <span class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ getFirstName(userStore.getUserById(settlement.fromUserId)?.name) }}
                    </span>
                  </div>

                  <!-- Arrow -->
                  <div class="flex-shrink-0 text-gray-400">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>

                  <!-- To user (creditor) - clickable to show payment info -->
                  <button
                    @click="showPaymentInfo(settlement.toUserId)"
                    class="flex items-center gap-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors"
                    :title="'Ver datos de pago de ' + getFirstName(userStore.getUserById(settlement.toUserId)?.name)"
                  >
                    <div class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <span class="text-xs font-medium text-green-700 dark:text-green-400">
                        {{ userStore.getUserInitials(settlement.toUserId) }}
                      </span>
                    </div>
                    <span class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ getFirstName(userStore.getUserById(settlement.toUserId)?.name) }}
                    </span>
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>

                  <!-- Amount -->
                  <div class="ml-auto">
                    <span class="text-lg font-semibold text-gray-900 dark:text-white font-mono tabular-nums">
                      {{ formatCurrency(settlement.amount) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Expense Modal -->
      <div
        v-if="showExpenseModal"
        class="fixed inset-0 z-50 overflow-y-auto"
        @click.self="closeExpenseModal"
      >
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/50 transition-opacity" @click="closeExpenseModal"></div>

        <!-- Modal -->
        <div class="relative min-h-screen flex items-center justify-center p-4">
          <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <!-- Header -->
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Agregar gasto
              </h3>
              <button
                @click="closeExpenseModal"
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Form -->
            <form @submit.prevent="handleAddExpense">
              <!-- Currency -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Moneda
                </label>
                <select
                  v-model="expenseForm.currency"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ARS">Pesos argentinos (ARS)</option>
                  <option value="USD">Dólares (USD)</option>
                  <option value="EUR">Euros (EUR)</option>
                  <option value="BRL">Reales brasileños (BRL)</option>
                </select>
              </div>

              <!-- Amount -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Monto *
                </label>
                <input
                  v-model.number="expenseForm.amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  :placeholder="getCurrencyPlaceholder(expenseForm.currency)"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p v-if="expenseForm.currency !== 'ARS' && expenseForm.amount" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ≈ {{ formatCurrency(convertToARS(expenseForm.amount, expenseForm.currency)) }}
                </p>
              </div>

              <!-- Description -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción *
                </label>
                <input
                  v-model="expenseForm.description"
                  type="text"
                  required
                  maxlength="200"
                  placeholder="Almuerzo en el centro"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <!-- Category -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Categoría
                </label>
                <select
                  v-model="expenseForm.category"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="food">Comida</option>
                  <option value="transport">Transporte</option>
                  <option value="accommodation">Alojamiento</option>
                  <option value="entertainment">Entretenimiento</option>
                  <option value="shopping">Compras</option>
                  <option value="general">Otro</option>
                </select>
              </div>

              <!-- Participants -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ¿Quiénes participan en este gasto?
                </label>
                <div class="space-y-2 max-h-48 overflow-y-auto">
                  <label
                    v-for="user in userStore.users"
                    :key="user.id"
                    class="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded cursor-pointer"
                  >
                    <input
                      v-model="expenseForm.participants"
                      type="checkbox"
                      :value="user.id"
                      class="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span class="text-gray-700 dark:text-gray-300">{{ user.name }}</span>
                  </label>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Selecciona las personas que compartirán este gasto
                </p>
              </div>

              <!-- Error message -->
              <div v-if="expenseFormError" class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p class="text-sm text-red-800 dark:text-red-200">{{ expenseFormError }}</p>
              </div>

              <!-- Actions -->
              <div class="flex gap-3">
                <button
                  type="button"
                  @click="closeExpenseModal"
                  class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  :disabled="expenseFormLoading"
                  class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
                >
                  <span v-if="expenseFormLoading">Guardando...</span>
                  <span v-else>Guardar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Payment Info Modal -->
      <div
        v-if="showPaymentModal"
        class="fixed inset-0 z-50 overflow-y-auto"
        @click.self="closePaymentModal"
      >
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/50 transition-opacity" @click="closePaymentModal"></div>

        <!-- Modal -->
        <div class="relative min-h-screen flex items-center justify-center p-4">
          <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <!-- Header -->
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <span class="text-sm font-medium text-green-700 dark:text-green-400">
                    {{ paymentModalUser ? userStore.getUserInitials(paymentModalUser.id) : '' }}
                  </span>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ paymentModalUser?.name }}
                  </h3>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Datos de pago</p>
                </div>
              </div>
              <button
                @click="closePaymentModal"
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Payment Info -->
            <div v-if="paymentModalUser?.paymentInfo && hasAnyPaymentInfo(paymentModalUser.paymentInfo)" class="space-y-4">
              <div v-if="paymentModalUser.paymentInfo.cbu" class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div class="flex items-center justify-between mb-1">
                  <label class="text-sm font-medium text-gray-600 dark:text-gray-400">CBU</label>
                  <button
                    @click="copyToClipboard(paymentModalUser.paymentInfo.cbu)"
                    class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs"
                  >
                    Copiar
                  </button>
                </div>
                <p class="text-gray-900 dark:text-white font-mono text-sm break-all">{{ paymentModalUser.paymentInfo.cbu }}</p>
              </div>

              <div v-if="paymentModalUser.paymentInfo.cvu" class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div class="flex items-center justify-between mb-1">
                  <label class="text-sm font-medium text-gray-600 dark:text-gray-400">CVU</label>
                  <button
                    @click="copyToClipboard(paymentModalUser.paymentInfo.cvu)"
                    class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs"
                  >
                    Copiar
                  </button>
                </div>
                <p class="text-gray-900 dark:text-white font-mono text-sm break-all">{{ paymentModalUser.paymentInfo.cvu }}</p>
              </div>

              <div v-if="paymentModalUser.paymentInfo.alias" class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div class="flex items-center justify-between mb-1">
                  <label class="text-sm font-medium text-gray-600 dark:text-gray-400">Alias</label>
                  <button
                    @click="copyToClipboard(paymentModalUser.paymentInfo.alias)"
                    class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs"
                  >
                    Copiar
                  </button>
                </div>
                <p class="text-gray-900 dark:text-white">{{ paymentModalUser.paymentInfo.alias }}</p>
              </div>

              <div v-if="paymentModalUser.paymentInfo.bankName" class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <label class="text-sm font-medium text-gray-600 dark:text-gray-400">Banco/Plataforma</label>
                <p class="text-gray-900 dark:text-white">{{ paymentModalUser.paymentInfo.bankName }}</p>
              </div>
            </div>

            <!-- No payment info -->
            <div v-else class="text-center py-8">
              <div class="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <p class="text-gray-500 dark:text-gray-400">
                {{ paymentModalUser?.name }} no ha configurado sus datos de pago.
              </p>
            </div>

            <!-- Close button -->
            <div class="mt-6">
              <button
                @click="closePaymentModal"
                class="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Apply auth middleware
definePageMeta({
  middleware: ['auth']
})

const { user, signOut } = useAuth()
const router = useRouter()
const expenseStore = useExpenseStore()
const userStore = useUserStore()
const groupStore = useGroupStore()

const sortedBalances = computed(() => userStore.getSortedBalances())
const settlements = computed(() => userStore.calculateSettlements())

// Handle group selection change
const handleGroupChange = (event) => {
  groupStore.selectGroup(event.target.value)
}

// Get first name for display in settlements
const getFirstName = (fullName) => {
  if (!fullName) return '?'
  return fullName.split(' ')[0]
}

// Expense form state
const { firestoreUser } = useAuth()
const showExpenseModal = ref(false)
const expenseFormLoading = ref(false)
const expenseFormError = ref(null)
const expenseForm = reactive({
  amount: null,
  description: '',
  category: 'general',
  currency: 'ARS',
  participants: [] // User IDs participating in the expense
})

// Exchange rates (approximate, for UI preview)
const exchangeRates = {
  USD: 1300, // 1 USD ≈ 1300 ARS
  EUR: 1400, // 1 EUR ≈ 1400 ARS
  BRL: 260   // 1 BRL ≈ 260 ARS
}

const convertToARS = (amount, currency) => {
  if (currency === 'ARS') return amount
  const rate = exchangeRates[currency]
  return rate ? Math.round(amount * rate) : amount
}

const getCurrencyPlaceholder = (currency) => {
  const placeholders = {
    ARS: '1000',
    USD: '10',
    EUR: '10',
    BRL: '50'
  }
  return placeholders[currency] || '100'
}

const openExpenseModal = () => {
  // Pre-select current user as participant
  if (firestoreUser.value) {
    expenseForm.participants = [firestoreUser.value.id]
  }
  showExpenseModal.value = true
}

const closeExpenseModal = () => {
  showExpenseModal.value = false
  expenseFormError.value = null
  // Reset form
  expenseForm.amount = null
  expenseForm.description = ''
  expenseForm.category = 'general'
  expenseForm.currency = 'ARS'
  expenseForm.participants = []
}

// Payment info modal state
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

const hasAnyPaymentInfo = (info) => {
  if (!info) return false
  return info.cbu || info.cvu || info.alias || info.bankName
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    // Could add a toast notification here
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const handleAddExpense = async () => {
  // Validate
  if (!expenseForm.amount || expenseForm.amount <= 0) {
    expenseFormError.value = 'El monto debe ser mayor a 0'
    return
  }
  if (!expenseForm.description.trim()) {
    expenseFormError.value = 'La descripción es requerida'
    return
  }
  if (!firestoreUser.value) {
    expenseFormError.value = 'No estás autenticado'
    return
  }
  if (!groupStore.selectedGroupId) {
    expenseFormError.value = 'No hay grupo seleccionado'
    return
  }
  if (expenseForm.participants.length === 0) {
    expenseFormError.value = 'Debes seleccionar al menos un participante'
    return
  }

  expenseFormLoading.value = true
  expenseFormError.value = null

  try {
    const amountInARS = convertToARS(expenseForm.amount, expenseForm.currency)
    const originalAmount = expenseForm.currency !== 'ARS' ? expenseForm.amount : undefined
    const originalCurrency = expenseForm.currency !== 'ARS' ? expenseForm.currency : undefined

    await expenseStore.addExpense(
      firestoreUser.value.id,
      firestoreUser.value.name,
      Math.round(amountInARS),
      expenseForm.description.trim(),
      expenseForm.category,
      `${expenseForm.amount} ${expenseForm.currency} ${expenseForm.description}`, // originalInput
      groupStore.selectedGroupId,
      expenseForm.participants,
      originalAmount,
      originalCurrency
    )
    closeExpenseModal()
  } catch (error) {
    console.error('Error adding expense:', error)
    expenseFormError.value = 'Error al guardar el gasto. Intenta nuevamente.'
  } finally {
    expenseFormLoading.value = false
  }
}

const categoryLabels = {
  food: 'Comida',
  transport: 'Transporte',
  accommodation: 'Alojamiento',
  entertainment: 'Entretenimiento',
  general: 'General'
}

const categoryColors = {
  food: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  transport: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  accommodation: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  entertainment: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  general: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
}

const getCategoryLabel = (category) => categoryLabels[category] ?? categoryLabels.general

const getCategoryColor = (category) => categoryColors[category] ?? categoryColors.general

// Get user initials from display name
const getUserInitials = (displayName) => {
  if (!displayName) return 'U'

  const parts = String(displayName).trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? 'U'
  const second = parts[1]?.[0] ?? ''
  return `${first}${second}`.toUpperCase()
}

// Handle sign out
const handleSignOut = async () => {
  try {
    await signOut()
    router.push('/login')
  } catch (error) {
    console.error('Sign out failed:', error)
  }
}
</script>
