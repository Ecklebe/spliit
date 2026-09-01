'use client'

import { GroupForm } from '@/components/group-form'
import { useToast } from '@/components/ui/use-toast'
import { isUnauthorizedError, useGroupActions } from '@/contexts'
import { trpc } from '@/trpc/client'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

export const CreateGroup = ({
  defaultCurrencyCode,
}: {
  defaultCurrencyCode: string
}) => {
  const { mutateAsync } = trpc.groups.create.useMutation()
  const utils = trpc.useUtils()
  const router = useRouter()
  const { saveRecentGroup } = useGroupActions()
  const { toast } = useToast()
  const t = useTranslations('Groups.CreateErrors')

  return (
    <GroupForm
      defaultCurrencyCode={defaultCurrencyCode}
      onSubmit={async (groupFormValues) => {
        try {
          const { id: groupId } = await mutateAsync({ groupFormValues })
          await utils.groups.invalidate()

          // Save to recent groups - context handles auto-sync if conditions met
          await saveRecentGroup({ id: groupId, name: groupFormValues.name })

          router.push(`/groups/${groupId}`)
        } catch (error) {
          // Edge case: an admin turned on "require login to create groups"
          // (see /admin) while this form was already open in the browser -
          // the server-side gate (assertGroupCreationAllowed) is the real
          // enforcement, this page's own guard only ran once at initial
          // load. router.refresh() re-runs that guard, redirecting to
          // /groups now that it reflects the current setting.
          if (isUnauthorizedError(error)) {
            toast({
              title: t('sessionExpiredTitle'),
              description: t('sessionExpiredDescription'),
              variant: 'destructive',
            })
            router.refresh()
            return
          }
          throw error
        }
      }}
    />
  )
}
