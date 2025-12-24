import { defineStore } from 'pinia'
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc
} from 'firebase/firestore'
import type { Group } from '~/types'

interface GroupState {
  groups: Group[]
  selectedGroupId: string | null
  currentUserId: string | null  // Track current user for Firestore updates
  loading: boolean
  error: string | null
}

const STORAGE_KEY = 'text-the-check-selected-group'

export const useGroupStore = defineStore('group', {
  state: (): GroupState => ({
    groups: [],
    selectedGroupId: null,
    currentUserId: null,
    loading: false,
    error: null
  }),

  getters: {
    /**
     * Get the currently selected group
     */
    selectedGroup: (state): Group | null => {
      if (!state.selectedGroupId) return null
      return state.groups.find(g => g.id === state.selectedGroupId) || null
    },

    /**
     * Get members of the selected group
     */
    selectedGroupMembers: (state): string[] => {
      if (!state.selectedGroupId) return []
      const group = state.groups.find(g => g.id === state.selectedGroupId)
      return group?.members || []
    },

    /**
     * Check if user has multiple groups
     */
    hasMultipleGroups: (state): boolean => state.groups.length > 1
  },

  actions: {
    /**
     * Fetch groups for the current user
     * @param userId - The Firestore user ID
     * @param activeGroupId - The user's activeGroupId from Firestore (optional)
     */
    async fetchGroupsForUser(userId: string, activeGroupId?: string | null) {
      const { db } = useFirebase()
      this.loading = true
      this.error = null
      this.currentUserId = userId

      try {
        const groupsRef = collection(db, 'groups')
        // Query groups where the user is a member
        const q = query(groupsRef, where('members', 'array-contains', userId))
        const snapshot = await getDocs(q)

        this.groups = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Group[]

        // Select group based on priority: activeGroupId > localStorage > first group
        this.restoreOrSelectDefaultGroup(activeGroupId)
      } catch (err: any) {
        console.error('Error fetching groups:', err)
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Restore selected group from activeGroupId, localStorage, or select first available
     * Priority: activeGroupId (from Firestore) > localStorage > first group
     */
    restoreOrSelectDefaultGroup(activeGroupId?: string | null) {
      if (this.groups.length === 0) {
        this.selectedGroupId = null
        return
      }

      // 1. Try to use activeGroupId from Firestore (highest priority)
      if (activeGroupId && this.groups.some(g => g.id === activeGroupId)) {
        this.selectedGroupId = activeGroupId
        // Also update localStorage to keep in sync
        if (import.meta.client) {
          localStorage.setItem(STORAGE_KEY, activeGroupId)
        }
        return
      }

      // 2. Try to restore from localStorage
      if (import.meta.client) {
        const savedGroupId = localStorage.getItem(STORAGE_KEY)
        if (savedGroupId && this.groups.some(g => g.id === savedGroupId)) {
          this.selectedGroupId = savedGroupId
          return
        }
      }

      // 3. Default to first group
      this.selectedGroupId = this.groups[0]?.id || null
    },

    /**
     * Select a group and sync to Firestore
     */
    async selectGroup(groupId: string) {
      if (!this.groups.some(g => g.id === groupId)) {
        console.warn('Attempted to select non-existent group:', groupId)
        return
      }

      this.selectedGroupId = groupId

      // Persist to localStorage
      if (import.meta.client) {
        localStorage.setItem(STORAGE_KEY, groupId)
      }

      // Sync activeGroupId to Firestore
      if (this.currentUserId) {
        try {
          const { db } = useFirebase()
          const userRef = doc(db, 'users', this.currentUserId)
          await updateDoc(userRef, { activeGroupId: groupId })
        } catch (err) {
          console.error('Error syncing activeGroupId to Firestore:', err)
          // Don't throw - local state is updated, Firestore sync failed but user can still use app
        }
      }
    },

    /**
     * Clear group state (on logout)
     */
    clearGroups() {
      this.groups = []
      this.selectedGroupId = null
      this.currentUserId = null
      if (import.meta.client) {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }
})
