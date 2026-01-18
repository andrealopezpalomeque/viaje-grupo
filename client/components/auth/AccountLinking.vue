<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
    <div class="max-w-md w-full">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
        <h1 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Vincular tu cuenta
        </h1>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Ingresaste como <span class="font-medium text-gray-900 dark:text-white">{{ email }}</span>
        </p>

        <!-- Phone Number Input -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Ingresa tu numero de telefono:
          </label>
          <div class="flex gap-2">
            <input
              v-model="phoneNumber"
              type="tel"
              placeholder="+54 9 379 4123456"
              class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              @keyup.enter="linkByPhone"
            />
            <button
              @click="linkByPhone"
              :disabled="!phoneNumber.trim() || isLinking"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {{ isLinking ? '...' : 'Vincular' }}
            </button>
          </div>
          <p v-if="phoneError" class="mt-2 text-sm text-red-600 dark:text-red-400">
            {{ phoneError }}
          </p>
        </div>

        <!-- Divider -->
        <div class="flex items-center gap-3 mb-6">
          <div class="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
          <span class="text-sm text-gray-500 dark:text-gray-400">o selecciona tu nombre</span>
          <div class="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
        </div>

        <!-- Loading state -->
        <div v-if="loadingUsers" class="text-center py-4">
          <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <p class="mt-2 text-sm text-gray-500">Cargando usuarios...</p>
        </div>

        <!-- Name Selection -->
        <div v-else class="space-y-2 max-h-60 overflow-y-auto">
          <button
            v-for="user in availableUsers"
            :key="user.id"
            @click="linkByUser(user)"
            :disabled="isLinking"
            class="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <span class="font-medium text-gray-900 dark:text-white">{{ user.name }}</span>
            <span v-if="user.phone" class="text-sm text-gray-500 dark:text-gray-400 ml-2">
              {{ maskPhone(user.phone) }}
            </span>
          </button>

          <p v-if="availableUsers.length === 0" class="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
            No hay usuarios disponibles para vincular
          </p>
        </div>

        <p v-if="selectError" class="mt-3 text-sm text-red-600 dark:text-red-400">
          {{ selectError }}
        </p>

        <!-- Cancel -->
        <button
          @click="handleCancel"
          :disabled="isLinking"
          class="mt-6 w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
        >
          Cancelar y salir
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { User } from '~/types'

const {
  pendingGoogleUser,
  linkAccountByPhone,
  linkAccountByUserId,
  cancelAccountLinking,
  getUsersWithoutEmail
} = useAuth()

const phoneNumber = ref('')
const phoneError = ref('')
const selectError = ref('')
const isLinking = ref(false)
const loadingUsers = ref(true)
const availableUsers = ref<User[]>([])

const email = computed(() => pendingGoogleUser.value?.email || '')

// Mask phone for privacy (show last 4 digits)
function maskPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  return '***' + phone.slice(-4)
}

async function linkByPhone() {
  if (!phoneNumber.value.trim()) return

  phoneError.value = ''
  selectError.value = ''
  isLinking.value = true

  try {
    await linkAccountByPhone(phoneNumber.value)
    // Success - auth composable will update state
  } catch (error: any) {
    phoneError.value = error.message || 'Error al vincular cuenta'
  } finally {
    isLinking.value = false
  }
}

async function linkByUser(user: User) {
  phoneError.value = ''
  selectError.value = ''
  isLinking.value = true

  try {
    await linkAccountByUserId(user.id)
    // Success - auth composable will update state
  } catch (error: any) {
    selectError.value = error.message || 'Error al vincular cuenta'
  } finally {
    isLinking.value = false
  }
}

async function handleCancel() {
  isLinking.value = true
  try {
    await cancelAccountLinking()
  } finally {
    isLinking.value = false
  }
}

// Fetch users on mount
onMounted(async () => {
  loadingUsers.value = true
  try {
    availableUsers.value = await getUsersWithoutEmail()
    // Sort by name
    availableUsers.value.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error('Error fetching users:', error)
  } finally {
    loadingUsers.value = false
  }
})
</script>
