import type { RecentGroup } from '@/app/groups/recent-groups-helpers'
import type { UseQueryResult } from '@tanstack/react-query'

// Re-export RecentGroup from the helpers file for convenience
export type { RecentGroup } from '@/app/groups/recent-groups-helpers'

/**
 * Cloud-synced group data returned from listGroups procedure.
 */
export interface SyncedGroup {
  groupId: string
  isStarred: boolean
  isArchived: boolean
  activeParticipantId: string | null
  syncedAt: Date
  group: { id: string; name: string }
}

/**
 * Merged group data from localStorage and cloud.
 */
export interface GroupsData {
  recentGroups: RecentGroup[]
  starredGroupIds: Set<string>
  archivedGroupIds: Set<string>
  syncedGroupIds: Set<string>
  source: 'local-only' | 'merged'
  syncError?: Error
}

/**
 * All available group mutation actions.
 */
export interface GroupActions {
  saveRecentGroup: (group: RecentGroup) => Promise<void>
  deleteRecentGroup: (groupId: string) => void
  starGroup: (groupId: string) => Promise<void>
  unstarGroup: (groupId: string) => Promise<void>
  archiveGroup: (groupId: string) => Promise<void>
  unarchiveGroup: (groupId: string) => Promise<void>
  syncGroup: (groupId: string) => Promise<void>
  unsyncGroup: (groupId: string) => Promise<void>
  syncAllGroups: () => Promise<{ synced: number; skipped: number }>
  refresh: () => void
  clearLocalData: () => void
}

/**
 * Core context value exposed to action hooks.
 * Contains primitives needed to build actions.
 */
export interface CoreGroupsContextValue {
  groupsQuery: UseQueryResult<GroupsData>
  queryKey: readonly unknown[]
  sessionStatus: 'loading' | 'authenticated' | 'unauthenticated'
  updateOptimistic: (updater: (old: GroupsData) => GroupsData) => void
  handleSyncError: (error: unknown, fallbackMessage: string) => void
  mutations: {
    addGroup: ReturnType<
      typeof import('@/trpc/client').trpc.sync.addGroup.useMutation
    >
    removeGroup: ReturnType<
      typeof import('@/trpc/client').trpc.sync.removeGroup.useMutation
    >
    updateMetadata: ReturnType<
      typeof import('@/trpc/client').trpc.sync.updateMetadata.useMutation
    >
    syncAll: ReturnType<
      typeof import('@/trpc/client').trpc.sync.syncAll.useMutation
    >
  }
  utils: ReturnType<typeof import('@/trpc/client').trpc.useUtils>
  preferencesQuery: ReturnType<
    typeof import('@/trpc/client').trpc.sync.getPreferences.useQuery
  >
  /** Internal: clear localStorage and query cache */
  _clearLocalData: () => void
  /** Internal: invalidate groups query */
  _refresh: () => void
}

/**
 * Public context value for external consumers.
 */
export interface GroupsContextValue {
  groupsQuery: UseQueryResult<GroupsData>
  actions: GroupActions
}
