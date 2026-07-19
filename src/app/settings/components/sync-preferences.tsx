'use client'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { trpc } from '@/trpc/client'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function SyncPreferences() {
  const t = useTranslations('Settings.SyncPreferences')
  const {
    data: preferences,
    isLoading,
    refetch,
  } = trpc.sync.getPreferences.useQuery()
  const updatePreferences = trpc.sync.updatePreferences.useMutation({
    onSuccess: () => refetch(),
  })

  if (isLoading) {
    return <Loader2 className="w-4 h-4 animate-spin" />
  }

  const handleToggle = async (key: 'syncNewGroups', value: boolean) => {
    await updatePreferences.mutateAsync({ [key]: value })
  }

  return (
    <div className="flex items-center justify-between space-x-2">
      <div className="flex-1">
        <Label htmlFor="sync-new" className="font-medium">
          {t('syncNewGroups.label')}
        </Label>
        <p className="text-sm text-muted-foreground">
          {t('syncNewGroups.description')}
        </p>
      </div>
      <Switch
        id="sync-new"
        checked={preferences?.syncNewGroups ?? false}
        onCheckedChange={(checked) => handleToggle('syncNewGroups', checked)}
        disabled={updatePreferences.isPending}
      />
    </div>
  )
}
