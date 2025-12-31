<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
    <!-- Header -->
    <div class="px-3 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
      <IconSwapHorizontal class="w-5 h-5 text-gray-500 dark:text-gray-400" />
      <h3 class="text-base font-semibold text-gray-900 dark:text-white">
        Para Saldar Deudas
      </h3>
    </div>

    <!-- All Settled State -->
    <div v-if="settlements.length === 0" class="p-8 text-center">
      <div class="w-14 h-14 mx-auto mb-3 bg-positive-100 dark:bg-positive-900/30 rounded-full flex items-center justify-center">
        <IconCheck class="w-7 h-7 text-positive-600 dark:text-positive-400" />
      </div>
      <p class="text-gray-600 dark:text-gray-400 font-medium">Todos al dia</p>
      <p class="text-sm text-gray-500 dark:text-gray-500 mt-1">No hay deudas pendientes</p>
    </div>

    <!-- Settlement Items -->
    <div v-else class="divide-y divide-gray-100 dark:divide-gray-700">
      <SettlementItem
        v-for="(settlement, index) in settlements"
        :key="index"
        :settlement="settlement"
        :index="index"
      />
    </div>
  </div>
</template>

<script setup>
import IconSwapHorizontal from '~icons/mdi/swap-horizontal'
import IconCheck from '~icons/mdi/check'

defineProps({
  settlements: { type: Array, required: true }
})
</script>
