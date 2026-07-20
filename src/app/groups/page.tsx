import { RecentGroupList } from '@/app/groups/recent-group-list'
import { getServerSession } from '@/lib/auth'
import { getRuntimeFeatureFlags } from '@/lib/featureFlags'
import { getInstanceSettings } from '@/lib/instance-settings'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('Groups')

  return {
    title: t('recent'),
  };
}

export default async function GroupsPage() {
  const { enableLogin } = await getRuntimeFeatureFlags()

  let canCreateGroups = true
  if (enableLogin) {
    const { requireLoginToCreateGroups } = await getInstanceSettings()
    if (requireLoginToCreateGroups) {
      canCreateGroups = !!(await getServerSession())?.user?.id
    }
  }

  return <RecentGroupList enableLogin={enableLogin} canCreateGroups={canCreateGroups} />
}
