'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { useGroupActions, useGroups, type RecentGroup } from '@/contexts'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { StarFilledIcon } from '@radix-ui/react-icons'
import {
  Calendar,
  Cloud,
  CloudOff,
  Loader2,
  MoreHorizontal,
  Star,
  Users,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function RecentGroupListCard({
  group,
  groupDetail,
}: {
  group: RecentGroup
  groupDetail?: AppRouterOutput['groups']['list']['groups'][number]
}) {
  const router = useRouter()
  const locale = useLocale()
  const toast = useToast()
  const t = useTranslations('Groups')
  const groupFormT = useTranslations('GroupForm.Settings')
  const { data: session } = useSession()
  const [showUnsyncDialog, setShowUnsyncDialog] = useState(false)
  const [isSyncLoading, setIsSyncLoading] = useState(false)

  const { isSynced, isStarred, isArchived } = useGroups()
  const {
    starGroup,
    unstarGroup,
    archiveGroup,
    unarchiveGroup,
    deleteRecentGroup,
    syncGroup,
    unsyncGroup,
  } = useGroupActions()

  const groupIsSynced = isSynced(group.id)
  const groupIsStarred = isStarred(group.id)
  const groupIsArchived = isArchived(group.id)
  const canSync = !!session

  const handleRemoveRecent = (event: React.MouseEvent) => {
    event.stopPropagation()

    if (groupIsSynced) {
      setShowUnsyncDialog(true)
    } else {
      deleteRecentGroup(group.id)
      toast.toast({
        title: t('RecentRemovedToast.title'),
        description: t('RecentRemovedToast.description'),
      })
    }
  }

  const handleUnsyncAndRemove = async () => {
    await unsyncGroup(group.id)
    deleteRecentGroup(group.id)

    setShowUnsyncDialog(false)
    toast.toast({
      title: t('Card.toast.unsyncRemoved.title'),
      description: t('Card.toast.unsyncRemoved.description'),
    })
  }

  const handleToggleSync = async (event: React.MouseEvent) => {
    event.stopPropagation()
    setIsSyncLoading(true)
    try {
      if (groupIsSynced) {
        await unsyncGroup(group.id)
      } else {
        await syncGroup(group.id)
      }
    } finally {
      setIsSyncLoading(false)
    }
  }

  return (
    <li key={group.id}>
      <Button
        variant="secondary"
        className="h-fit w-full py-3 rounded-lg border bg-card shadow-sm"
        asChild
      >
        <div
          className="text-base cursor-pointer"
          onClick={() => router.push(`/groups/${group.id}`)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              router.push(`/groups/${group.id}`)
            }
          }}
        >
        <div className="w-full flex flex-col gap-1">
          <div className="text-base flex gap-2 justify-between">
            <Link
              href={`/groups/${group.id}`}
              className="flex-1 overflow-hidden text-ellipsis flex items-center gap-2"
            >
              <span className="truncate">{group.name}</span>
            </Link>
            <span className="flex-shrink-0 flex items-center">
              {/* Sync toggle button - only show when logged in */}
              {canSync && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="-my-3 -ml-3 -mr-1.5"
                    onClick={handleToggleSync}
                  disabled={isSyncLoading}
                  title={t(
                    groupIsSynced
                      ? 'Card.actions.unsyncTooltip'
                      : 'Card.actions.syncTooltip',
                  )}
                >
                  {isSyncLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : groupIsSynced ? (
                    <Cloud className="w-4 h-4 text-blue-500" />
                  ) : (
                    <CloudOff className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="-my-3 -ml-3 -mr-1.5"
                title={
                  groupIsStarred
                    ? t('Card.actions.unfavoriteTooltip')
                    : t('Card.actions.favoriteTooltip')
                }
                onClick={async (event) => {
                  event.stopPropagation()
                  if (groupIsStarred) {
                    await unstarGroup(group.id)
                  } else {
                    await starGroup(group.id)
                  }
                }}
              >
                {groupIsStarred ? (
                  <StarFilledIcon className="w-4 h-4 text-orange-400" />
                ) : (
                  <Star className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="-my-3 -mr-3 -ml-1.5"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive"
                      onClick={handleRemoveRecent}
                  >
                    {t('removeRecent')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async (event) => {
                      event.stopPropagation()
                      if (groupIsArchived) {
                        await unarchiveGroup(group.id)
                      } else {
                        await archiveGroup(group.id)
                      }
                    }}
                  >
                    {t(groupIsArchived ? 'unarchive' : 'archive')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          </div>
          <div className="text-muted-foreground font-normal text-xs">
            {groupDetail ? (
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="w-3 h-3 inline mr-1" />
                  <span>{groupDetail._count.participants}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 inline mx-1" />
                  <span>
                    {new Date(groupDetail.createdAt).toLocaleDateString(
                      locale,
                      {
                        dateStyle: 'medium',
                      },
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between">
                <Skeleton className="h-4 w-6 rounded-full" />
                <Skeleton className="h-4 w-24 rounded-full" />
              </div>
            )}
          </div>
        </div>
      </div>
      </Button>

      {/* Confirmation dialog for removing synced group */}
      <AlertDialog open={showUnsyncDialog} onOpenChange={setShowUnsyncDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Card.unsyncDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Card.unsyncDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{groupFormT('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnsyncAndRemove}>
              {t('Card.unsyncDialog.actions.removeAndUnsync')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}
