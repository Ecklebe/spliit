import {
  getArchivedGroups,
  getRecentGroups,
  getStarredGroups,
  saveArchivedGroups,
  saveRecentGroups,
  saveStarredGroups,
} from '@/app/groups/recent-groups-helpers'
import { TRPCClientError } from '@trpc/client'
import type { GroupsData, SyncedGroup } from './types'

/**
 * Load group data from localStorage.
 * Returns empty data on failure.
 */
export function loadFromLocalStorage(): GroupsData {
  try {
    const recentGroups = getRecentGroups()
    const starredGroups = getStarredGroups()
    const archivedGroups = getArchivedGroups()

    return {
      recentGroups,
      starredGroupIds: new Set(starredGroups),
      archivedGroupIds: new Set(archivedGroups),
      syncedGroupIds: new Set(),
      source: 'local-only',
    }
  } catch (error) {
    console.warn('Failed to load from localStorage:', error)
    return {
      recentGroups: [],
      starredGroupIds: new Set(),
      archivedGroupIds: new Set(),
      syncedGroupIds: new Set(),
      source: 'local-only',
    }
  }
}

/**
 * Merge local and cloud group data.
 * Server data wins for conflicts.
 */
export function mergeGroups(
  local: GroupsData,
  cloud: SyncedGroup[],
): GroupsData {
  const merged: GroupsData = {
    recentGroups: [],
    starredGroupIds: new Set(),
    archivedGroupIds: new Set(),
    syncedGroupIds: new Set(),
    source: 'merged',
  }

  // Server groups first (they win conflicts)
  for (const serverGroup of cloud) {
    merged.recentGroups.push({
      id: serverGroup.groupId,
      name: serverGroup.group.name,
    })
    if (serverGroup.isStarred) merged.starredGroupIds.add(serverGroup.groupId)
    if (serverGroup.isArchived) merged.archivedGroupIds.add(serverGroup.groupId)
    merged.syncedGroupIds.add(serverGroup.groupId)
  }

  // Local-only groups preserved (not on server)
  for (const localGroup of local.recentGroups) {
    if (merged.recentGroups.find((g) => g.id === localGroup.id)) continue
    merged.recentGroups.push(localGroup)
    if (local.starredGroupIds.has(localGroup.id)) {
      merged.starredGroupIds.add(localGroup.id)
    }
    if (local.archivedGroupIds.has(localGroup.id)) {
      merged.archivedGroupIds.add(localGroup.id)
    }
  }

  return merged
}

/**
 * Persist group data to localStorage.
 */
export function persistToLocalStorage(data: GroupsData): void {
  saveRecentGroups(data.recentGroups)
  saveStarredGroups(Array.from(data.starredGroupIds))
  saveArchivedGroups(Array.from(data.archivedGroupIds))
}

/**
 * Check if an error is an UNAUTHORIZED tRPC error.
 * Useful for determining when to redirect to login.
 */
export function isUnauthorizedError(error: unknown): boolean {
  return (
    error instanceof TRPCClientError &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (error as TRPCClientError<any>).data?.code === 'UNAUTHORIZED'
  )
}
