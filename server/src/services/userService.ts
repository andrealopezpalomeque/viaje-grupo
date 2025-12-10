import { db } from '../config/firebase.js'
import type { User } from '../types/index.js'

/**
 * Get user by phone number
 */
export const getUserByPhone = async (phoneNumber: string): Promise<User | null> => {
  try {
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalized = phoneNumber.replace(/[\s-]/g, '')

    const usersRef = db.collection('users')
    const snapshot = await usersRef.where('phoneNumber', '==', normalized).limit(1).get()

    if (snapshot.empty) {
      return null
    }

    const doc = snapshot.docs[0]
    return {
      id: doc.id,
      ...doc.data()
    } as User
  } catch (error) {
    console.error('Error getting user by phone:', error)
    return null
  }
}

/**
 * Check if phone number is authorized
 */
export const isAuthorizedPhone = (phoneNumber: string): boolean => {
  const allowedPhones = process.env.ALLOWED_PHONE_NUMBERS?.split(',') || []
  const normalized = phoneNumber.replace(/[\s-]/g, '')

  return allowedPhones.some(allowed =>
    allowed.replace(/[\s-]/g, '') === normalized
  )
}
