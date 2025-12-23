import { defineStore } from 'pinia'
import {
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore'
import type { Group } from '~/types'

interface GroupState {
  groups: Group[]
  selectedGroupId: string | null
  loading: boolean
  error: string | null
}

const STORAGE_KEY = 'text-the-check-selected-group'

export const useGroupStore = defineStore('group', {
  state: (): GroupState => ({
    groups: [],
    selectedGroupId: null,
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
     */
    async fetchGroupsForUser(userId: string) {
      const { db } = useFirebase()
      this.loading = true
      this.error = null

      try {
        const groupsRef = collection(db, 'groups')
        // Query groups where the user is a member
        const q = query(groupsRef, where('members', 'array-contains', userId))
        const snapshot = await getDocs(q)

        this.groups = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Group[]

        // Restore selected group from localStorage or select first group
        this.restoreOrSelectDefaultGroup()
      } catch (err: any) {
        console.error('Error fetching groups:', err)
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Restore selected group from localStorage or select first available
     */
    restoreOrSelectDefaultGroup() {
      if (this.groups.length === 0) {
        this.selectedGroupId = null
        return
      }

      // Try to restore from localStorage
      if (import.meta.client) {
        const savedGroupId = localStorage.getItem(STORAGE_KEY)
        if (savedGroupId && this.groups.some(g => g.id === savedGroupId)) {
          this.selectedGroupId = savedGroupId
          return
        }
      }

      // Default to first group
      this.selectedGroupId = this.groups[0]?.id || null
    },

    /**
     * Select a group
     */
    selectGroup(groupId: string) {
      if (!this.groups.some(g => g.id === groupId)) {
        console.warn('Attempted to select non-existent group:', groupId)
        return
      }

      this.selectedGroupId = groupId

      // Persist to localStorage
      if (import.meta.client) {
        localStorage.setItem(STORAGE_KEY, groupId)
      }
    },

    /**
     * Clear group state (on logout)
     */
    clearGroups() {
      this.groups = []
      this.selectedGroupId = null
      if (import.meta.client) {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }
})
