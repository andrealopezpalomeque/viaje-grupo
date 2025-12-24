<template>
  <div>
    <NuxtPage />

    <!-- Global loading overlay while auth initializes - ClientOnly to prevent SSR hydration issues -->
    <ClientOnly>
      <div
        v-if="authLoading"
        class="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex items-center justify-center"
      >
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mb-4"></div>
          <p class="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const { isAuthenticated, firestoreUser, loading: authLoading } = useAuth()
const expenseStore = useExpenseStore()
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
    groupStore.clearGroups()
  }
}, { immediate: true })

// Watch for group changes and reinitialize data
watch(() => groupStore.selectedGroupId, (newGroupId, oldGroupId) => {
  if (newGroupId && newGroupId !== oldGroupId && isAuthenticated.value) {
    const members = groupStore.selectedGroupMembers
    expenseStore.initializeListeners(newGroupId)
    userStore.fetchUsers(members)
  }
})

// Cleanup on unmount
onUnmounted(() => {
  expenseStore.stopListeners()
})
</script>
