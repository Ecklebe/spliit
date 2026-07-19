'use client'

import { LoginButton } from '@/components/login-button'
import { Button } from '@/components/ui/button'
import type { Session } from '@/lib/auth'
import { useSession } from '@zitadel/next-auth/react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

// Signed out: a clear "Login" button opening a popup with the OIDC provider
// options (see login-button.tsx). Signed in: the "Settings" link, for
// managing the account/synced groups. Rendered only when enableLogin (the
// parent header already gates this entirely - see layout.tsx).
export function HeaderAuthSection() {
  const { data: sessionData, status } = useSession()
  // Cast: see the matching cast/comment in settings-content.tsx and
  // getServerSession (src/lib/auth.ts) - useSession()'s declared Session
  // type doesn't reach our roles augmentation.
  const session = sessionData as unknown as Session | null
  const t = useTranslations('Header')

  if (status === 'loading') return null

  if (session) {
    return (
      <Button variant="ghost" size="sm" asChild className="-my-3 text-primary">
        <Link href="/settings">{t('settings')}</Link>
      </Button>
    )
  }

  return <LoginButton />
}
