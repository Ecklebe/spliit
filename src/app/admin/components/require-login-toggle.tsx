'use client'

import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { trpc } from '@/trpc/client'
import { useTranslations } from 'next-intl'

export function RequireLoginToggle() {
  const t = useTranslations('Admin.requireLoginToggle')
  const { toast } = useToast()
  const utils = trpc.useUtils()
  const settingsQuery = trpc.admin.getSettings.useQuery()
  const updateMutation = trpc.admin.updateSettings.useMutation({
    onSuccess: () => utils.admin.getSettings.invalidate(),
    onError: (error) => {
      toast({
        title: t('errorTitle'),
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  return (
    <div className="rounded-lg border p-4 flex items-start justify-between gap-4">
      <div className="space-y-1">
        <p className="font-medium">{t('label')}</p>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>
      <Switch
        checked={settingsQuery.data?.requireLoginToCreateGroups ?? false}
        disabled={settingsQuery.isLoading || updateMutation.isPending}
        onCheckedChange={(checked) =>
          updateMutation.mutate({ requireLoginToCreateGroups: checked })
        }
      />
    </div>
  )
}
