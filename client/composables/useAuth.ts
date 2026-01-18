import {
  signInWithRedirect,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth'
import type { Auth } from 'firebase/auth'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  type Firestore
} from 'firebase/firestore'
import type { User } from '~/types'

// Extended user info combining Firebase Auth and Firestore user
interface AuthenticatedUser {
  firebaseUser: FirebaseUser
  firestoreUser: User
}

// Helper function to normalize phone numbers for comparison
const normalizePhoneNumber = (phone: string): string => {
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, '')

  // Ensure it starts with + for international format
  if (!normalized.startsWith('+')) {
    // Assume Argentina if no country code
    if (normalized.startsWith('549')) {
      normalized = '+' + normalized
    } else if (normalized.startsWith('9')) {
      normalized = '+54' + normalized
    } else {
      normalized = '+549' + normalized
    }
  }

  return normalized
}

export const useAuth = () => {
  const { $auth, $db } = useNuxtApp()
  const auth = $auth as Auth | undefined
  const db = $db as Firestore | undefined

  // Use shallowRef to prevent deep reactivity on Firebase User object
  // This avoids cross-origin errors when the User contains popup window references
  const user = useState<FirebaseUser | null>('auth-user', () => null)
  const firestoreUser = useState<User | null>('firestore-user', () => null)
  const loading = useState<boolean>('auth-loading', () => true)
  const error = useState<string | null>('auth-error', () => null)

  // Account linking states
  const needsAccountLinking = useState<boolean>('needs-account-linking', () => false)
  const pendingGoogleUser = useState<FirebaseUser | null>('pending-google-user', () => null)

  const requireAuth = () => {
    if (!auth) {
      throw new Error(
        'Firebase Auth is not available. Ensure the Firebase Nuxt plugin runs before calling useAuth().'
      )
    }
    return auth
  }

  const requireDb = () => {
    if (!db) {
      throw new Error(
        'Firebase Firestore is not available. Ensure the Firebase Nuxt plugin runs before calling useAuth().'
      )
    }
    return db
  }

  /**
   * Look up a user in Firestore by email
   */
  const findUserByEmail = async (email: string): Promise<User | null> => {
    try {
      const database = requireDb()
      const usersRef = collection(database, 'users')

      // Query for exact email match
      const q = query(usersRef, where('email', '==', email.toLowerCase()))
      const snapshot = await getDocs(q)

      if (!snapshot.empty && snapshot.docs[0]) {
        const userDoc = snapshot.docs[0]
        return {
          id: userDoc.id,
          ...userDoc.data()
        } as User
      }

      return null
    } catch (err) {
      console.error('Error finding user by email:', err)
      return null
    }
  }

  /**
   * Update user's email in Firestore
   */
  const updateUserEmail = async (userId: string, email: string): Promise<boolean> => {
    try {
      const database = requireDb()
      const userRef = doc(database, 'users', userId)
      await updateDoc(userRef, { email: email.toLowerCase() })
      return true
    } catch (err) {
      console.error('Error updating user email:', err)
      return false
    }
  }

  /**
   * Look up a user in Firestore by phone number
   */
  const findUserByPhone = async (phoneNumber: string): Promise<User | null> => {
    try {
      const database = requireDb()
      const usersRef = collection(database, 'users')
      const normalized = normalizePhoneNumber(phoneNumber)

      // Try 'phone' field first
      let q = query(usersRef, where('phone', '==', normalized))
      let snapshot = await getDocs(q)

      // Fallback to legacy 'phoneNumber' field
      if (snapshot.empty) {
        q = query(usersRef, where('phoneNumber', '==', normalized))
        snapshot = await getDocs(q)
      }

      if (!snapshot.empty && snapshot.docs[0]) {
        const userDoc = snapshot.docs[0]
        return {
          id: userDoc.id,
          ...userDoc.data()
        } as User
      }

      return null
    } catch (err) {
      console.error('Error finding user by phone:', err)
      return null
    }
  }

  /**
   * Find user by ID
   */
  const findUserById = async (userId: string): Promise<User | null> => {
    try {
      const database = requireDb()
      const userRef = doc(database, 'users', userId)
      const { getDoc } = await import('firebase/firestore')
      const snapshot = await getDoc(userRef)

      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...snapshot.data()
        } as User
      }

      return null
    } catch (err) {
      console.error('Error finding user by id:', err)
      return null
    }
  }

  /**
   * Get all users without email (for account linking selection)
   */
  const getUsersWithoutEmail = async (): Promise<User[]> => {
    try {
      const database = requireDb()
      const usersRef = collection(database, 'users')
      const q = query(usersRef, where('email', '==', null))
      const snapshot = await getDocs(q)

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[]
    } catch (err) {
      console.error('Error getting users without email:', err)
      return []
    }
  }

  /**
   * Link account by phone number
   */
  const linkAccountByPhone = async (phoneNumber: string): Promise<void> => {
    if (!pendingGoogleUser.value) {
      throw new Error('No hay usuario de Google pendiente')
    }

    const userByPhone = await findUserByPhone(phoneNumber)

    if (!userByPhone) {
      throw new Error('No se encontró un usuario con ese número de teléfono')
    }

    // Check if user already has a different email
    if (userByPhone.email && userByPhone.email !== pendingGoogleUser.value.email?.toLowerCase()) {
      throw new Error('Este usuario ya tiene otro email asociado')
    }

    // Update user record with email and authUid
    const database = requireDb()
    const userRef = doc(database, 'users', userByPhone.id)
    await updateDoc(userRef, {
      email: pendingGoogleUser.value.email?.toLowerCase(),
      authUid: pendingGoogleUser.value.uid
    })

    // Complete login
    firestoreUser.value = {
      ...userByPhone,
      email: pendingGoogleUser.value.email?.toLowerCase() || null,
      authUid: pendingGoogleUser.value.uid
    }
    needsAccountLinking.value = false
    pendingGoogleUser.value = null
  }

  /**
   * Link account by user ID (when selecting from list)
   */
  const linkAccountByUserId = async (userId: string): Promise<void> => {
    if (!pendingGoogleUser.value) {
      throw new Error('No hay usuario de Google pendiente')
    }

    const userById = await findUserById(userId)

    if (!userById) {
      throw new Error('Usuario no encontrado')
    }

    // Check if user already has a different email
    if (userById.email && userById.email !== pendingGoogleUser.value.email?.toLowerCase()) {
      throw new Error('Este usuario ya tiene otro email asociado')
    }

    // Update user record with email and authUid
    const database = requireDb()
    const userRef = doc(database, 'users', userById.id)
    await updateDoc(userRef, {
      email: pendingGoogleUser.value.email?.toLowerCase(),
      authUid: pendingGoogleUser.value.uid
    })

    // Complete login
    firestoreUser.value = {
      ...userById,
      email: pendingGoogleUser.value.email?.toLowerCase() || null,
      authUid: pendingGoogleUser.value.uid
    }
    needsAccountLinking.value = false
    pendingGoogleUser.value = null
  }

  /**
   * Cancel account linking and sign out
   */
  const cancelAccountLinking = async (): Promise<void> => {
    await firebaseSignOut(requireAuth())
    user.value = null
    firestoreUser.value = null
    needsAccountLinking.value = false
    pendingGoogleUser.value = null
  }

  /**
   * Link Firebase Auth user with Firestore user
   * Returns the matched Firestore user or null if not authorized
   */
  const linkAuthToFirestore = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    const email = firebaseUser.email

    if (!email) {
      console.error('Firebase user has no email')
      return null
    }

    // Look up by email
    const existingUser = await findUserByEmail(email)

    if (existingUser) {
      // Store/update the authUid if not already set or if it changed
      if (existingUser.authUid !== firebaseUser.uid) {
        try {
          const database = requireDb()
          const userRef = doc(database, 'users', existingUser.id)
          await updateDoc(userRef, { authUid: firebaseUser.uid })
          existingUser.authUid = firebaseUser.uid
        } catch (err) {
          console.error('Error updating authUid:', err)
          // Continue anyway - user can still use the app, just can't update their profile yet
        }
      }
      return existingUser
    }

    // Email not found - user is not pre-registered
    // For now, deny access to non-registered users
    return null
  }

  // Initialize auth state listener
  // Returns a promise that resolves when the first auth state is determined
  const initAuth = (): Promise<void> => {
    loading.value = true

    return new Promise((resolve) => {
      try {
        // onAuthStateChanged handles both normal auth and redirect results
        onAuthStateChanged(
          requireAuth(),
          async (firebaseUser) => {
            if (firebaseUser) {
              // Use markRaw to prevent Vue from making the User object deeply reactive
              user.value = markRaw(firebaseUser)

              // Try to link with Firestore user
              const linkedUser = await linkAuthToFirestore(firebaseUser)

              if (linkedUser) {
                firestoreUser.value = linkedUser
                needsAccountLinking.value = false
                pendingGoogleUser.value = null
              } else {
                // User not found by email - trigger account linking flow
                firestoreUser.value = null
                needsAccountLinking.value = true
                pendingGoogleUser.value = markRaw(firebaseUser)
              }
            } else {
              user.value = null
              firestoreUser.value = null
              needsAccountLinking.value = false
              pendingGoogleUser.value = null
            }
            loading.value = false
            resolve()
          },
          (err) => {
            console.error('Auth state change error:', err)
            error.value = err.message
            loading.value = false
            resolve()
          }
        )
      } catch (err: any) {
        console.error(err)
        error.value = err?.message ?? 'Firebase Auth initialization error'
        loading.value = false
        resolve()
      }
    })
  }

  // Sign in with Google using redirect (more reliable than popup)
  const signInWithGoogle = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      const provider = new GoogleAuthProvider()
      // This will redirect to Google, then back to the app
      // The result is handled in initAuth via getRedirectResult
      await signInWithRedirect(requireAuth(), provider)
    } catch (err: any) {
      console.error('Sign in error:', err)
      error.value = err.message || 'Error al iniciar sesión con Google'
      loading.value = false
      throw err
    }
    // Note: loading stays true because we're redirecting away
  }

  // Sign out
  const signOut = async () => {
    loading.value = true
    error.value = null

    try {
      await firebaseSignOut(requireAuth())
      user.value = null
      firestoreUser.value = null
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
    firestoreUser: readonly(firestoreUser),
    loading: readonly(loading),
    error: readonly(error),
    isAuthenticated: computed(() => !!user.value && !!firestoreUser.value),
    isFirebaseAuthenticated: computed(() => !!user.value),
    needsAccountLinking: readonly(needsAccountLinking),
    pendingGoogleUser: readonly(pendingGoogleUser),
    initAuth,
    signInWithGoogle,
    signOut,
    linkAccountByPhone,
    linkAccountByUserId,
    cancelAccountLinking,
    getUsersWithoutEmail
  }
}
