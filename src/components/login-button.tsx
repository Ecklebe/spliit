'use client'

import { SignInForm } from '@/app/settings/components/sign-in-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { LogIn } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

export function LoginButton() {
  const [open, setOpen] = useState(false)
  const t = useTranslations('Header')
  const cloudSyncT = useTranslations('Settings.CloudSync')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          // align-middle: this button's first flex child is an icon (no text
          // baseline), so its default vertical-align: baseline positions it
          // ~4px lower than the plain-text Groups/Settings buttons next to it
          // (whose baseline comes from real text) - align-middle sidesteps
          // that mismatch entirely.
          className="-my-3 text-primary align-middle"
        >
          <LogIn className="w-4 h-4 mr-1" />
          {t('login')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{cloudSyncT('title')}</DialogTitle>
          <DialogDescription>
            {cloudSyncT('description.signedOut')}
          </DialogDescription>
        </DialogHeader>
        <SignInForm />
      </DialogContent>
    </Dialog>
  )
}
