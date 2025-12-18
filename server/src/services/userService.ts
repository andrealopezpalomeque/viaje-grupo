import { db } from '../config/firebase.js'
import type { User } from '../types/index.js'

const normalizePhone = (phoneNumber: string): string => {
  // WhatsApp Cloud API typically sends numbers without '+', while configs often include it.
  // Compare using digits-only so '+54911...' and '54911...' match.
  return phoneNumber.replace(/[^\d]/g, '')
}

/**
 * Get user by phone number
 */
export const getUserByPhone = async (phoneNumber: string): Promise<User | null> => {
  try {
    const usersRef = db.collection('users')

    const digitsOnly = normalizePhone(phoneNumber)
    const candidates = [
      phoneNumber.replace(/[\s-]/g, ''),
      digitsOnly,
      `+${digitsOnly}`,
    ].filter(Boolean)

    const uniqueCandidates = [...new Set(candidates)]

    for (const candidate of uniqueCandidates) {
      const snapshot = await usersRef.where('phoneNumber', '==', candidate).limit(1).get()
      if (!snapshot.empty) {
        const doc = snapshot.docs[0]
        return {
          id: doc.id,
          ...doc.data()
        } as User
      }
    }

    return null
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
  const normalized = normalizePhone(phoneNumber)

  return allowedPhones.some(allowed =>
    normalizePhone(allowed) === normalized
  )
}
