<template>
  <div>
    <!-- Loading state - always visible during auth init -->
    <div
      v-if="authLoading"
      class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"
    >
      <div class="text-center">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-500 dark:text-gray-400">Cargando...</p>
      </div>
    </div>

    <!-- Account linking screen -->
    <AuthAccountLinking v-else-if="needsAccountLinking" />

    <!-- Main app content -->
    <NuxtPage v-else />
  </div>
</template>

<script setup>
const { isAuthenticated, firestoreUser, loading: authLoading, needsAccountLinking } = useAuth()
const expenseStore = useExpenseStore()
const paymentStore = usePaymentStore()
const userStore = useUserStore()
const groupStore = useGroupStore()

// Initialize data when authenticated
const initializeData = async () => {
  if (!firestoreUser.value) return

  // Fetch groups for the current user, passing activeGroupId for priority selection
  await groupStore.fetchGroupsForUser(firestoreUser.value.id, firestoreUser.value.activeGroupId)

  // Initialize data for the selected group
  const groupId = groupStore.selectedGroupId
  const members = groupStore.selectedGroupMembers

  if (groupId) {
    expenseStore.initializeListeners(groupId)
    paymentStore.initializeListeners(groupId)
    userStore.fetchUsers(members)
  }
}

// Watch for auth changes
watch(isAuthenticated, async (authenticated) => {
  if (authenticated) {
    await initializeData()
  } else {
    // Stop listeners and clear state when not authenticated
    expenseStore.stopListeners()
    paymentStore.stopListeners()
    groupStore.clearGroups()
  }
}, { immediate: true })

// Watch for group changes and reinitialize data
watch(() => groupStore.selectedGroupId, (newGroupId, oldGroupId) => {
  if (newGroupId && newGroupId !== oldGroupId && isAuthenticated.value) {
    const members = groupStore.selectedGroupMembers
    expenseStore.initializeListeners(newGroupId)
    paymentStore.initializeListeners(newGroupId)
    userStore.fetchUsers(members)
  }
})

// Cleanup on unmount
onUnmounted(() => {
  expenseStore.stopListeners()
  paymentStore.stopListeners()
})
</script>
