'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Cloud } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const ANNOUNCEMENT_CUTOFF = new Date('2026-03-24')
const STORAGE_KEY = 'sync-feature-dismissed'

export function SyncFeatureAnnouncement() {
  const { data: session } = useSession()
  const [isVisible, setIsVisible] = useState(false)
  const t = useTranslations('SyncAnnouncement')

  useEffect(() => {
    // Don't show if signed in
    if (session) {
      setIsVisible(false)
      return
    }

    // Check dismissal state
    const dismissed = localStorage.getItem(STORAGE_KEY)

    if (!dismissed) {
      setIsVisible(true)
      return
    }

    const dismissedDate = new Date(dismissed)
    const twoMonthsFromDismiss = new Date(dismissedDate)
    twoMonthsFromDismiss.setMonth(dismissedDate.getMonth() + 2)

    // Don't show if dismissed and either past 2 months or past cutoff
    if (
      new Date() >= twoMonthsFromDismiss ||
      new Date() >= ANNOUNCEMENT_CUTOFF
    ) {
      setIsVisible(false)
    } else {
      setIsVisible(true)
    }
  }, [session])

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString())
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <Alert className="mb-4">
      <Cloud className="h-4 w-4" />
      <AlertTitle>{t('title')}</AlertTitle>
      <AlertDescription>
        {t('body')}{' '}
        <Link href="/settings" className="underline">
          {t('actions.settings')}
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="ml-2"
        >
          {t('actions.dismiss')}
        </Button>
      </AlertDescription>
    </Alert>
  )
}
