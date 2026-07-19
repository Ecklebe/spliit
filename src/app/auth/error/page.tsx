'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const t = useTranslations('AuthError')

  const getErrorMessage = () => {
    switch (error) {
      case 'Verification':
        return t('messages.verification')
      case 'Configuration':
        return t('messages.configuration')
      default:
        return t('messages.default')
    }
  }

  return (
    <div className="container max-w-md py-16">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-destructive" />
            <CardTitle>{t('title')}</CardTitle>
          </div>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{getErrorMessage()}</p>
          <Button asChild className="w-full">
            <Link href="/settings">{t('actions.goToSettings')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthErrorPage() {
  const commonT = useTranslations('Common')
  return (
    <Suspense
      fallback={
        <div className="container max-w-md py-16">{commonT('loading')}</div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  )
}
