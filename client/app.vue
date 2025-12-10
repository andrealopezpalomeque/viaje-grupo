<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
// Initialize stores on app mount
onMounted(() => {
  const expenseStore = useExpenseStore()
  expenseStore.initializeListeners()
})

// Cleanup on unmount
onUnmounted(() => {
  const expenseStore = useExpenseStore()
  expenseStore.stopListeners()
})
</script>
