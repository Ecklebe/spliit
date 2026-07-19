'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useMemo } from 'react'
import { useCoreGroupsContext } from './core-context'
import type { GroupActions, RecentGroup } from './types'

/**
 * Hook that provides all group mutation actions.
 *
 * All actions automatically handle:
 * - Optimistic cache updates
 * - localStorage persistence
 * - Cloud sync for authenticated users
 *
 * @example
 * ```tsx
 * const { starGroup, saveRecentGroup, syncGroup } = useGroupActions()
 *
 * // Star a group (updates cache + localStorage + cloud)
 * await starGroup('group-123')
 *
 * // Save a recently visited group
 * await saveRecentGroup({ id: 'group-123', name: 'Trip to Paris' })
 * ```
 */
export function useGroupActions(): GroupActions {
  const {
    groupsQuery,
    sessionStatus,
    updateOptimistic,
    handleSyncError,
    mutations,
    utils,
    preferencesQuery,
    _clearLocalData,
    _refresh,
  } = useCoreGroupsContext()
  const t = useTranslations('SyncErrors.toast')

  const saveRecentGroup = useCallback(
    async (group: RecentGroup) => {
      // 1. Update cache + localStorage optimistically
      updateOptimistic((old) => ({
        ...old,
        recentGroups: [
          group,
          ...old.recentGroups.filter((g) => g.id !== group.id),
        ],
      }))

      // 2. Auto-sync if conditions met
      const prefs = preferencesQuery.data as
        | { syncNewGroups?: boolean }
        | undefined
      if (
        sessionStatus === 'authenticated' &&
        prefs?.syncNewGroups &&
        !groupsQuery.data?.syncedGroupIds.has(group.id)
      ) {
        try {
          // Check if omitted first
          const isOmittedResult = await utils.sync.isOmitted.fetch({
            groupId: group.id,
          })
          if (isOmittedResult.omitted) return

          await mutations.addGroup.mutateAsync({
            groupId: group.id,
            isStarred: groupsQuery.data?.starredGroupIds.has(group.id) ?? false,
            isArchived:
              groupsQuery.data?.archivedGroupIds.has(group.id) ?? false,
          })
          // Update cache to mark as synced
          updateOptimistic((old) => {
            const newSynced = new Set(old.syncedGroupIds)
            newSynced.add(group.id)
            return { ...old, syncedGroupIds: newSynced }
          })
        } catch (error) {
          handleSyncError(error, t('saveLocalFailed'))
        }
      }
    },
    [
      sessionStatus,
      preferencesQuery.data,
      groupsQuery.data,
      updateOptimistic,
      utils.sync.isOmitted,
      mutations.addGroup,
      handleSyncError,
      t,
    ],
  )

  const deleteRecentGroup = useCallback(
    (groupId: string) => {
      updateOptimistic((old) => ({
        ...old,
        recentGroups: old.recentGroups.filter((g) => g.id !== groupId),
      }))
    },
    [updateOptimistic],
  )

  const starGroup = useCallback(
    async (groupId: string) => {
      // Update cache optimistically
      updateOptimistic((old) => {
        const newStarred = new Set(old.starredGroupIds)
        newStarred.add(groupId)
        const newArchived = new Set(old.archivedGroupIds)
        newArchived.delete(groupId)
        return {
          ...old,
          starredGroupIds: newStarred,
          archivedGroupIds: newArchived,
        }
      })

      // If authenticated + synced → call sync.updateMetadata
      if (
        sessionStatus === 'authenticated' &&
        groupsQuery.data?.syncedGroupIds.has(groupId)
      ) {
        try {
          await mutations.updateMetadata.mutateAsync({
            groupId,
            isStarred: true,
            isArchived: false,
          })
        } catch (error) {
          handleSyncError(error, t('starFailed'))
        }
      }
    },
    [
      updateOptimistic,
      sessionStatus,
      groupsQuery.data,
      mutations.updateMetadata,
      handleSyncError,
      t,
    ],
  )

  const unstarGroup = useCallback(
    async (groupId: string) => {
      // Update cache optimistically
      updateOptimistic((old) => {
        const newStarred = new Set(old.starredGroupIds)
        newStarred.delete(groupId)
        return { ...old, starredGroupIds: newStarred }
      })

      // If authenticated + synced → call sync.updateMetadata
      if (
        sessionStatus === 'authenticated' &&
        groupsQuery.data?.syncedGroupIds.has(groupId)
      ) {
        try {
          await mutations.updateMetadata.mutateAsync({
            groupId,
            isStarred: false,
          })
        } catch (error) {
          handleSyncError(error, t('unstarFailed'))
        }
      }
    },
    [
      updateOptimistic,
      sessionStatus,
      groupsQuery.data,
      mutations.updateMetadata,
      handleSyncError,
      t,
    ],
  )

  const archiveGroup = useCallback(
    async (groupId: string) => {
      // Update cache optimistically
      updateOptimistic((old) => {
        const newStarred = new Set(old.starredGroupIds)
        newStarred.delete(groupId)
        const newArchived = new Set(old.archivedGroupIds)
        newArchived.add(groupId)
        return {
          ...old,
          starredGroupIds: newStarred,
          archivedGroupIds: newArchived,
        }
      })

      // If authenticated + synced → call sync.updateMetadata
      if (
        sessionStatus === 'authenticated' &&
        groupsQuery.data?.syncedGroupIds.has(groupId)
      ) {
        try {
          await mutations.updateMetadata.mutateAsync({
            groupId,
            isStarred: false,
            isArchived: true,
          })
        } catch (error) {
          handleSyncError(error, t('archiveFailed'))
        }
      }
    },
    [
      updateOptimistic,
      sessionStatus,
      groupsQuery.data,
      mutations.updateMetadata,
      handleSyncError,
      t,
    ],
  )

  const unarchiveGroup = useCallback(
    async (groupId: string) => {
      // Update cache optimistically
      updateOptimistic((old) => {
        const newArchived = new Set(old.archivedGroupIds)
        newArchived.delete(groupId)
        return { ...old, archivedGroupIds: newArchived }
      })

      // If authenticated + synced → call sync.updateMetadata
      if (
        sessionStatus === 'authenticated' &&
        groupsQuery.data?.syncedGroupIds.has(groupId)
      ) {
        try {
          await mutations.updateMetadata.mutateAsync({
            groupId,
            isArchived: false,
          })
        } catch (error) {
          handleSyncError(error, t('unarchiveFailed'))
        }
      }
    },
    [
      updateOptimistic,
      sessionStatus,
      groupsQuery.data,
      mutations.updateMetadata,
      handleSyncError,
      t,
    ],
  )

  const syncGroup = useCallback(
    async (groupId: string) => {
      const currentData = groupsQuery.data
      if (!currentData) return

      await mutations.addGroup.mutateAsync({
        groupId,
        isStarred: currentData.starredGroupIds.has(groupId),
        isArchived: currentData.archivedGroupIds.has(groupId),
      })

      // Update cache: add to syncedGroupIds
      updateOptimistic((old) => {
        const newSynced = new Set(old.syncedGroupIds)
        newSynced.add(groupId)
        return { ...old, syncedGroupIds: newSynced }
      })
    },
    [groupsQuery.data, mutations.addGroup, updateOptimistic],
  )

  const unsyncGroup = useCallback(
    async (groupId: string) => {
      await mutations.removeGroup.mutateAsync({ groupId })

      // Update cache: remove from syncedGroupIds
      updateOptimistic((old) => {
        const newSynced = new Set(old.syncedGroupIds)
        newSynced.delete(groupId)
        return { ...old, syncedGroupIds: newSynced }
      })
    },
    [mutations.removeGroup, updateOptimistic],
  )

  const syncAllGroups = useCallback(async () => {
    const currentData = groupsQuery.data
    if (!currentData) return { synced: 0, skipped: 0 }

    const groups = currentData.recentGroups.map((group) => ({
      groupId: group.id,
      isStarred: currentData.starredGroupIds.has(group.id),
      isArchived: currentData.archivedGroupIds.has(group.id),
    }))

    const result = await mutations.syncAll.mutateAsync({ groups })

    // Update cache with all synced groups
    updateOptimistic((old) => ({
      ...old,
      syncedGroupIds: new Set(groups.map((g) => g.groupId)),
    }))

    return result
  }, [groupsQuery.data, mutations.syncAll, updateOptimistic])

  return useMemo<GroupActions>(
    () => ({
      saveRecentGroup,
      deleteRecentGroup,
      starGroup,
      unstarGroup,
      archiveGroup,
      unarchiveGroup,
      syncGroup,
      unsyncGroup,
      syncAllGroups,
      refresh: _refresh,
      clearLocalData: _clearLocalData,
    }),
    [
      saveRecentGroup,
      deleteRecentGroup,
      starGroup,
      unstarGroup,
      archiveGroup,
      unarchiveGroup,
      syncGroup,
      unsyncGroup,
      syncAllGroups,
      _refresh,
      _clearLocalData,
    ],
  )
}
