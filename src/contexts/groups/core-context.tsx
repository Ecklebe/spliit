'use client'

import { clearAllLocalGroupsData } from '@/app/groups/recent-groups-helpers'
import { useToast } from '@/components/ui/use-toast'
import { trpc } from '@/trpc/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import {
  isUnauthorizedError,
  loadFromLocalStorage,
  mergeGroups,
  persistToLocalStorage,
} from './helpers'
import type { CoreGroupsContextValue, GroupsData } from './types'

const CoreGroupsContext = createContext<CoreGroupsContextValue | null>(null)

/**
 * Internal hook to access core context.
 * Used by useGroupActions and useGroups.
 */
export function useCoreGroupsContext(): CoreGroupsContextValue {
  const context = useContext(CoreGroupsContext)
  if (!context) {
    throw new Error('useCoreGroupsContext must be used within a GroupsProvider')
  }
  return context
}

/**
 * Core provider that sets up:
 * - React Query for group data
 * - tRPC mutations
 * - Session state
 * - Helper functions for optimistic updates
 */
export function GroupsProvider({ children }: { children: ReactNode }) {
  const { data: session, status: sessionStatus } = useSession()
  const queryClient = useQueryClient()
  const utils = trpc.useUtils()
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('SyncErrors.toast')

  // tRPC mutations
  const addGroupMutation = trpc.sync.addGroup.useMutation()
  const removeGroupMutation = trpc.sync.removeGroup.useMutation()
  const updateMetadataMutation = trpc.sync.updateMetadata.useMutation()
  const syncAllMutation = trpc.sync.syncAll.useMutation()

  // Preferences query (for auto-sync)
  const preferencesQuery = trpc.sync.getPreferences.useQuery(undefined, {
    enabled: sessionStatus === 'authenticated',
  })

  // Query key
  const queryKey = useMemo(
    () => ['groups', session?.user?.id ?? 'anonymous'] as const,
    [session?.user?.id],
  )

  // Load groups pipeline
  const loadGroupsPipeline = useCallback(async (): Promise<GroupsData> => {
    const local = loadFromLocalStorage()

    if (sessionStatus !== 'authenticated') {
      return { ...local, source: 'local-only' }
    }

    try {
      const cloud = await utils.sync.listGroups.fetch()
      const merged = mergeGroups(local, cloud)
      persistToLocalStorage(merged)
      return { ...merged, source: 'merged' }
    } catch (error) {
      console.error('Cloud sync failed:', error)
      return { ...local, source: 'local-only', syncError: error as Error }
    }
  }, [sessionStatus, utils.sync.listGroups])

  const groupsQuery = useQuery({
    queryKey,
    queryFn: loadGroupsPipeline,
    placeholderData: () => {
      if (typeof window === 'undefined') {
        // Workaround for empty server-side data issue
        return {
          archivedGroupIds: new Set(),
          recentGroups: [],
          source: 'local-only',
          starredGroupIds: new Set(),
          syncedGroupIds: new Set(),
          syncError: undefined,
        } satisfies GroupsData
      }
      return loadFromLocalStorage()
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  // Session change effect
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      queryClient.removeQueries({ queryKey: ['groups'] })
    }
    if (sessionStatus !== 'loading') {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    }
  }, [sessionStatus, queryClient])

  // Helper for optimistic cache update
  const updateOptimistic = useCallback(
    (updater: (old: GroupsData) => GroupsData) => {
      queryClient.setQueryData<GroupsData>(queryKey, (old) => {
        if (!old) return old
        const updated = updater(old)
        persistToLocalStorage(updated)
        return updated
      })
    },
    [queryClient, queryKey],
  )

  // Helper for sync errors
  const handleSyncError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      if (isUnauthorizedError(error)) {
        router.push('/login')
      } else {
        toast({
          title: t('title'),
          description: fallbackMessage,
          variant: 'destructive',
        })
      }
    },
    [router, t, toast],
  )

  // Clear local data action (needed here for queryClient access)
  const clearLocalData = useCallback(() => {
    clearAllLocalGroupsData()
    queryClient.removeQueries({ queryKey: ['groups'] })
  }, [queryClient])

  // Refresh action
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['groups'] })
  }, [queryClient])

  const value = useMemo<CoreGroupsContextValue>(
    () => ({
      groupsQuery,
      queryKey,
      sessionStatus,
      updateOptimistic,
      handleSyncError,
      mutations: {
        addGroup: addGroupMutation,
        removeGroup: removeGroupMutation,
        updateMetadata: updateMetadataMutation,
        syncAll: syncAllMutation,
      },
      utils,
      preferencesQuery,
      // Expose these directly for useGroupActions
      _clearLocalData: clearLocalData,
      _refresh: refresh,
    }),
    [
      groupsQuery,
      queryKey,
      sessionStatus,
      updateOptimistic,
      handleSyncError,
      addGroupMutation,
      removeGroupMutation,
      updateMetadataMutation,
      syncAllMutation,
      utils,
      preferencesQuery,
      clearLocalData,
      refresh,
    ],
  )

  return (
    <CoreGroupsContext.Provider value={value}>
      {children}
    </CoreGroupsContext.Provider>
  )
}
