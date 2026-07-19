'use client'
import { useGroupActions } from '@/contexts'
import { useEffect } from 'react'
import { useCurrentGroup } from './current-group-context'

export function SaveGroupLocally() {
  const { group } = useCurrentGroup()
  const { saveRecentGroup } = useGroupActions()

  useEffect(() => {
    if (group) {
      // Fire and forget - we don't need to wait for the result
      saveRecentGroup({ id: group.id, name: group.name })
    }
  }, [group, saveRecentGroup])

  return null
}
