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
import { useGroupActions } from '@/contexts'
import type { Session } from '@/lib/auth'
import { buildEndSessionUrl, clearLocalSession } from '@/lib/oidc-logout'
import { useSession } from '@zitadel/next-auth/react'
import { LogOut } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

export function AccountInfo() {
  const { data: sessionData } = useSession()
  // Cast: see the matching cast/comment in settings-content.tsx and
  // getServerSession (src/lib/auth.ts) - useSession()'s declared Session
  // type doesn't reach our roles/idToken augmentation.
  const session = sessionData as unknown as Session | null
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const { clearLocalData } = useGroupActions()
  const t = useTranslations('Settings.Account')
  const groupFormT = useTranslations('GroupForm.Settings')

  const handleLogout = async (shouldClearData: boolean) => {
    if (shouldClearData) {
      clearLocalData()
    }

    const idToken = session?.idToken
    // Trailing slash matters: the OIDC provider matches
    // post_logout_redirect_uri by exact string against what's registered
    // for this app (e.g. k8s-infra/spliit-oidc.tf's
    // post_logout_redirect_uris = ["https://spliit.cluster.local/"]), and
    // window.location.origin never has a trailing slash.
    const endSessionUrl = idToken
      ? await buildEndSessionUrl(idToken, `${window.location.origin}/`)
      : null

    // Clearing the local session, then - if the provider supports
    // RP-initiated logout - also ending its SSO session, so a subsequent
    // sign-in actually prompts for credentials instead of silently
    // re-authenticating via the still-live provider session.
    await clearLocalSession()
    setShowLogoutDialog(false)
    window.location.href = endSessionUrl ?? window.location.pathname
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div>
          <p className="text-sm font-medium">{t('signedInAs')}</p>
          <p className="text-sm text-muted-foreground">
            {session?.user?.email}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLogoutDialog(true)}
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t('signOut')}
        </Button>
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('signOut')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('signOutDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{groupFormT('cancel')}</AlertDialogCancel>
            <Button variant="outline" onClick={() => handleLogout(false)}>
              {t('signOutDialog.keepGroups')}
            </Button>
            <AlertDialogAction onClick={() => handleLogout(true)}>
              {t('signOutDialog.clearGroups')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
