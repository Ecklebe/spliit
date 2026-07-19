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
import { LogOut } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function AccountInfo() {
  const { data: session } = useSession()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const router = useRouter()
  const { clearLocalData } = useGroupActions()
  const t = useTranslations('Settings.Account')
  const groupFormT = useTranslations('GroupForm.Settings')

  const handleLogout = async (shouldClearData: boolean) => {
    if (shouldClearData) {
      clearLocalData()
    }
    await signOut({ redirect: false })
    setShowLogoutDialog(false)
    router.refresh()
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
