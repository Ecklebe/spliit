'use client'

import { Button } from '@/components/ui/button'
import { useGroupActions, useGroups } from '@/contexts'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState } from 'react'

export function SyncedGroupsList() {
  const { recentGroups, syncedGroupIds, isRefetching, isStarred, isArchived } =
    useGroups()
  const { unsyncGroup } = useGroupActions()
  const [unsyncingId, setUnsyncingId] = useState<string | null>(null)
  const t = useTranslations('Settings.SyncedGroups')

  // Filter to only synced groups
  const syncedGroups = recentGroups.filter((g) => syncedGroupIds.has(g.id))

  const handleUnsync = async (groupId: string) => {
    setUnsyncingId(groupId)
    try {
      await unsyncGroup(groupId)
    } finally {
      setUnsyncingId(null)
    }
  }

  // Show loading on initial fetch (when data is empty and refetching)
  if (syncedGroups.length === 0 && isRefetching) {
    return <Loader2 className="w-4 h-4 animate-spin" />
  }

  if (syncedGroups.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('empty')}</p>
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-3">
        {t('count', { count: syncedGroups.length })}
      </p>
      <ul className="space-y-2">
        {syncedGroups.map((syncedGroup) => (
          <li
            key={syncedGroup.id}
            className="flex items-center justify-between p-3 bg-muted rounded-lg"
          >
            <div>
              <Link
                href={`/groups/${syncedGroup.id}`}
                className="font-medium hover:underline"
              >
                {syncedGroup.name}
              </Link>
              <p className="text-xs text-muted-foreground">
                {isStarred(syncedGroup.id) && '⭐ '}
                {isArchived(syncedGroup.id) && '📦 '}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUnsync(syncedGroup.id)}
              disabled={unsyncingId === syncedGroup.id}
            >
              {unsyncingId === syncedGroup.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('actions.unsync')
              )}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
