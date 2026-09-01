import { RecentGroupList } from '@/app/groups/recent-group-list'
import { TrackPage } from '@/lib/analytics/track-page'
import { getGroupCreationGate } from '@/lib/fork/group-creation'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('Groups')

  return {
    title: t('recent'),
  }
}

export default async function GroupsPage() {
  const { enableLogin, canCreateGroups } = await getGroupCreationGate()

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
