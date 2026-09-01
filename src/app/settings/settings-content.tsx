'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Session } from '@/lib/auth'
import { useSession } from '@zitadel/next-auth/react'
import { Loader2, Settings2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  AccountInfo,
  SignInForm,
  SyncAllGroups,
  SyncPreferences,
  SyncedGroupsList,
} from './components'

export function SettingsContent({ enableAdmin }: { enableAdmin: boolean }) {
  const { data: sessionData, status } = useSession()
  // Cast: useSession()'s declared Session type resolves against
  // @zitadel/next-auth's own nested @auth/core copy, which our roles
  // augmentation (targeting the top-level copy) doesn't reach - see the
  // matching cast/comment in getServerSession (src/lib/auth.ts).
  const session = sessionData as unknown as Session | null
  const t = useTranslations('Settings')
  const commonT = useTranslations('Common')
  const adminT = useTranslations('Admin')

  if (status === 'loading') {
    return (
      <div className="container max-w-4xl py-8">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <p className="text-sm text-muted-foreground">{commonT('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Settings2 className="w-8 h-8" />
        <h1 className="text-3xl font-bold flex-1">{t('title')}</h1>
        {enableAdmin && session?.user?.roles?.includes('admins') && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin">{adminT('title')}</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('CloudSync.title')}</CardTitle>
          <CardDescription>
            {session
              ? t('CloudSync.description.signedIn')
              : t('CloudSync.description.signedOut')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!session ? (
            <SignInForm />
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-3">
                  {t('sections.account')}
                </h3>
                <AccountInfo />
              </div>
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">
                  {t('sections.preferences')}
                </h3>
                <SyncPreferences />
              </div>
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">
                  {t('sections.actions')}
                </h3>
                <SyncAllGroups />
              </div>
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">
                  {t('sections.syncedGroups')}
                </h3>
                <SyncedGroupsList />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
