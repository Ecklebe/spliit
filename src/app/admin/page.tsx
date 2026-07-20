import { RequireLoginToggle } from '@/app/admin/components/require-login-toggle'
import { getServerSession } from '@/lib/auth'
import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Admin',
}

export default async function AdminPage() {
  // Off by default, like Traefik's own /dashboard entrypoint - an operator
  // opts in explicitly with ENABLE_ADMIN, independent of whether login/sync
  // is configured at all.
  if (!env.ENABLE_ADMIN) notFound()

  // Fully hidden - not just unlinked - when login is disabled or the
  // current user has no admin grant, same as /settings and /api/auth/*.
  if (env.OIDC_PROVIDERS.length === 0) notFound()

  const session = await getServerSession()
  // Role key is "admins" (plural) - matches the Zitadel project role key
  // defined in k8s-infra/spliit-oidc.tf, same convention as Jenkins/
  // Forgejo/Backstage's "admins"/"dev" roles elsewhere in this cluster.
  if (!session?.user?.roles?.includes('admins')) notFound()

  const t = await getTranslations('Admin')

  const [groupCount, participantCount, expenseCount, userCount, syncedGroupCount] =
    await Promise.all([
      prisma.group.count(),
      prisma.participant.count(),
      prisma.expense.count(),
      prisma.user.count(),
      prisma.syncedGroup.count(),
    ])

  const stats = [
    { label: t('stats.groups'), value: groupCount },
    { label: t('stats.participants'), value: participantCount },
    { label: t('stats.expenses'), value: expenseCount },
    { label: t('stats.signedInUsers'), value: userCount },
    { label: t('stats.syncedGroups'), value: syncedGroupCount },
  ]

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border p-4 flex flex-col gap-1"
          >
            <span className="text-2xl font-bold">{stat.value}</span>
            <span className="text-sm text-muted-foreground">{stat.label}</span>
          </div>
        ))}
      </div>
      <RequireLoginToggle />
    </div>
  )
}
