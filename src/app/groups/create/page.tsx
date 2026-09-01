import { CreateGroup } from '@/app/groups/create/create-group'
import { env } from '@/lib/env'
import { redirectIfGroupCreationBlocked } from '@/lib/fork/group-creation'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('Groups')

  return {
    title: t('createGroup'),
  }
}

export default async function CreateGroupPage() {
  await redirectIfGroupCreationBlocked()

  const defaultCurrencyCode =
    env.DEFAULT_CURRENCY_CODE ?? env.NEXT_PUBLIC_DEFAULT_CURRENCY_CODE ?? 'USD'
  return <CreateGroup defaultCurrencyCode={defaultCurrencyCode} />
}
