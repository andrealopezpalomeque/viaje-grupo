<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
// Initialize stores on app mount
onMounted(() => {
  const expenseStore = useExpenseStore()
  const userStore = useUserStore()
  expenseStore.initializeListeners()
  userStore.fetchUsers() // Fetch users on load
})

// Cleanup on unmount
onUnmounted(() => {
  const expenseStore = useExpenseStore()
  expenseStore.stopListeners()
})
</script>
