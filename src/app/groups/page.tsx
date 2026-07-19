import { RecentGroupList } from '@/app/groups/recent-group-list'
import { getRuntimeFeatureFlags } from '@/lib/featureFlags'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('Groups')

  return {
    title: t('recent'),
  };
}

export default async function GroupsPage() {
  const { enableLogin } = await getRuntimeFeatureFlags()
  return <RecentGroupList enableLogin={enableLogin} />
}
