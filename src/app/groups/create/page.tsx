import { CreateGroup } from '@/app/groups/create/create-group'
import { getServerSession } from '@/lib/auth'
import { env } from '@/lib/env'
import { getInstanceSettings } from '@/lib/instance-settings'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

export async function generateMetadata() {
  const t = await getTranslations('Groups')

  return {
    title: t('NoRecent.create'),
  };
}

export default async function CreateGroupPage() {
  // Since the only entry point (the Create button on /groups) is already
  // hidden in this state, this page just isn't reachable either - no UI
  // state to design here, just a guard.
  if (env.OIDC_PROVIDERS.length > 0) {
    const { requireLoginToCreateGroups } = await getInstanceSettings()
    if (requireLoginToCreateGroups) {
      const isSignedIn = !!(await getServerSession())?.user?.id
      if (!isSignedIn) redirect('/groups')
    }
  }

  return <CreateGroup />
}
