'use client'

import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import {
  getProviders,
  signIn,
  type ClientSafeProvider,
} from '@zitadel/next-auth/react'
import { KeyRound, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

export function SignInForm() {
  const t = useTranslations('Settings.SignIn')
  const [signingInId, setSigningInId] = useState<string | null>(null)

  // getProviders() only returns public provider metadata (id/name/type/
  // signinUrl/callbackUrl) via a server endpoint - never client_secret,
  // which stays server-side in src/lib/env.ts/auth.ts.
  const { data: providers, isLoading } = useQuery({
    queryKey: ['auth-providers'],
    queryFn: getProviders,
  })

  const providerList: ClientSafeProvider[] = providers
    ? Object.values(providers)
    : []

  if (isLoading) {
    return <Loader2 className="w-4 h-4 animate-spin" />
  }

  if (providerList.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('none')}</p>
  }

  return (
    <div className="space-y-2">
      {providerList.map((provider) => (
        <Button
          key={provider.id}
          variant="outline"
          className="w-full sm:w-auto"
          disabled={signingInId !== null}
          onClick={() => {
            setSigningInId(provider.id)
            signIn(provider.id)
          }}
        >
          {signingInId === provider.id ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <KeyRound className="w-4 h-4 mr-2" />
          )}
          {t('signInWith', { provider: provider.name })}
        </Button>
      ))}
    </div>
  )
}
