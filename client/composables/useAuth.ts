import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth'
import type { Auth } from 'firebase/auth'

export const useAuth = () => {
  const { $auth } = useNuxtApp()
  const auth = $auth as Auth | undefined

  // Use shallowRef to prevent deep reactivity on Firebase User object
  // This avoids cross-origin errors when the User contains popup window references
  const user = useState<User | null>('auth-user', () => null)
  const loading = useState<boolean>('auth-loading', () => true)
  const error = useState<string | null>('auth-error', () => null)

  const requireAuth = () => {
    if (!auth) {
      throw new Error(
        'Firebase Auth is not available. Ensure the Firebase Nuxt plugin runs before calling useAuth().'
      )
    }
    return auth
  }

  // Initialize auth state listener
  // Returns a promise that resolves when the first auth state is determined
  const initAuth = (): Promise<void> => {
    loading.value = true

    return new Promise((resolve) => {
      try {
        onAuthStateChanged(
          requireAuth(),
          (firebaseUser) => {
            // Use markRaw to prevent Vue from making the User object deeply reactive
            // This avoids cross-origin errors from OAuth popup window references
            user.value = firebaseUser ? markRaw(firebaseUser) : null
            loading.value = false
            resolve() // Resolve on first auth state change
          },
          (err) => {
            console.error('Auth state change error:', err)
            error.value = err.message
            loading.value = false
            resolve() // Resolve even on error to not block the app
          }
        )
      } catch (err: any) {
        console.error(err)
        error.value = err?.message ?? 'Firebase Auth initialization error'
        loading.value = false
        resolve() // Resolve on initialization error
      }
    })
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    loading.value = true
    error.value = null

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(requireAuth(), provider)
      // Use markRaw to prevent deep reactivity
      user.value = markRaw(result.user)
      return result.user
    } catch (err: any) {
      console.error('Sign in error:', err)
      error.value = err.message || 'Error al iniciar sesión con Google'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Sign out
  const signOut = async () => {
    loading.value = true
    error.value = null

    try {
      await firebaseSignOut(requireAuth())
      user.value = null
    } catch (err: any) {
      console.error('Sign out error:', err)
      error.value = err.message || 'Error al cerrar sesión'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    user: readonly(user),
    loading: readonly(loading),
    error: readonly(error),
    isAuthenticated: computed(() => !!user.value),
    initAuth,
    signInWithGoogle,
    signOut
  }
}
