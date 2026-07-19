import { SettingsContent } from '@/app/settings/settings-content'
import { env } from '@/lib/env'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Settings',
}

export default function SettingsPage() {
  // Fully hidden, not just unlinked, when no OIDC provider is configured -
  // see featureFlags.ts's enableLogin.
  if (env.OIDC_PROVIDERS.length === 0) notFound()
  return <SettingsContent enableAdmin={env.ENABLE_ADMIN} />
}
