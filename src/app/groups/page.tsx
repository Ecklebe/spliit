import { RecentGroupList } from '@/app/groups/recent-group-list'
import { TrackPage } from '@/lib/analytics/track-page'
import { getServerSession } from '@/lib/auth'
import { getRuntimeFeatureFlags } from '@/lib/featureFlags'
import { getInstanceSettings } from '@/lib/instance-settings'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('Groups')

  return {
    title: t('recent'),
  }
}

export default async function GroupsPage() {
  const { enableLogin } = await getRuntimeFeatureFlags()

  // The admin-configurable "require login to create groups" setting only ever
  // hides the create entry points; every existing group stays reachable by
  // link for anyone, signed in or not.
  let canCreateGroups = true
  if (enableLogin) {
    const { requireLoginToCreateGroups } = await getInstanceSettings()
    if (requireLoginToCreateGroups) {
      canCreateGroups = !!(await getServerSession())?.user?.id
    }
  }

  return (
    <>
      <TrackPage path="/groups" />
      <RecentGroupList
        enableLogin={enableLogin}
        canCreateGroups={canCreateGroups}
      />
    </>
  )
}
