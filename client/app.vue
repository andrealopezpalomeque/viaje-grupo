<template>
  <div>
    <NuxtPage />

    <!-- Global loading overlay while auth initializes -->
    <div
      v-if="authLoading"
      class="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex items-center justify-center"
    >
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mb-4"></div>
        <p class="text-gray-600 dark:text-gray-400">Cargando...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { isAuthenticated, loading: authLoading } = useAuth()

// Watch for auth changes and initialize data when authenticated
// Auth is already initialized by the plugin
watch(isAuthenticated, (authenticated) => {
  if (authenticated) {
    const expenseStore = useExpenseStore()
    const userStore = useUserStore()
    expenseStore.initializeListeners()
    userStore.fetchUsers()
  } else {
    // Stop listeners when not authenticated
    const expenseStore = useExpenseStore()
    expenseStore.stopListeners()
  }
}, { immediate: true })

// Cleanup on unmount
onUnmounted(() => {
  const expenseStore = useExpenseStore()
  expenseStore.stopListeners()
})
</script>
