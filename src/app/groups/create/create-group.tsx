'use client'

import { GroupForm } from '@/components/group-form'
import { useGroupActions } from '@/contexts'
import { trpc } from '@/trpc/client'
import { useRouter } from 'next/navigation'

export const CreateGroup = () => {
  const { mutateAsync } = trpc.groups.create.useMutation()
  const utils = trpc.useUtils()
  const router = useRouter()
  const { saveRecentGroup } = useGroupActions()

  return (
    <GroupForm
      onSubmit={async (groupFormValues) => {
        const { id: groupId } = await mutateAsync({ groupFormValues })
        await utils.groups.invalidate()

        // Save to recent groups - context handles auto-sync if conditions met
        await saveRecentGroup({ id: groupId, name: groupFormValues.name })

        router.push(`/groups/${groupId}`)
      }}
    />
  )
}
