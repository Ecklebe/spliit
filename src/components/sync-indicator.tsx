'use client'

import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function SyncIndicator() {
  const t = useTranslations('Common')
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>{t('syncing')}</span>
    </div>
  )
}
