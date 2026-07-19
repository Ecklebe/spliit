'use client'

import { useCoreGroupsContext } from './core-context'

/**
 * Hook to access group state.
 *
 * Provides access to group data, loading states, and helper functions to check
 * if a group is starred, archived, or synced.
 *
 * @example
 * ```tsx
 * const { recentGroups, isStarred, isSynced, isRefetching } = useGroups()
 *
 * // Check if a specific group is starred
 * if (isStarred('group-123')) {
 *   // Render star icon
 * }
 *
 * // Access all recent groups
 * recentGroups.map(group => <GroupCard key={group.id} group={group} />)
 * ```
 */
export function useGroups() {
  const { groupsQuery } = useCoreGroupsContext()
  const data = groupsQuery.data!

  return {
    recentGroups: data.recentGroups,
    starredGroupIds: data.starredGroupIds,
    archivedGroupIds: data.archivedGroupIds,
    syncedGroupIds: data.syncedGroupIds,
    isPending: groupsQuery.isPending,
    isSuccess: groupsQuery.isSuccess,
    isRefetching: groupsQuery.isRefetching,
    syncError: data.syncError,
    isStarred: (groupId: string) => data.starredGroupIds.has(groupId),
    isArchived: (groupId: string) => data.archivedGroupIds.has(groupId),
    isSynced: (groupId: string) => data.syncedGroupIds.has(groupId),
  }
}
