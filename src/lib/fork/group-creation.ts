import { getServerSession } from '@/lib/auth'
import { env } from '@/lib/env'
import { getRuntimeFeatureFlags } from '@/lib/featureFlags'
import { getInstanceSettings } from '@/lib/instance-settings'
import { redirect } from 'next/navigation'

/**
 * The admin-configurable "require login to create groups" setting, in one
 * place. Three call sites need it - the groups list (to hide the entry
 * point), the create page (to guard the route) and groups.create /
 * groups.importFromFile on the server - and keeping the predicate here is
 * what stops those drifting apart, which would make the setting bypassable.
 *
 * It gates *creation only*. Every group that already exists stays reachable,
 * readable and editable by anyone holding its link, signed in or not - see
 * the "Relationship to upstream Spliit" section of the README.
 *
 * Living under src/lib/fork/ so the upstream files that use it each carry a
 * single import and a single call rather than an inline block, which is what
 * keeps them cheap to merge.
 */
export type SessionLike = { user?: { id?: string | null } | null } | null

/**
 * `resolveSession` is a parameter because the two contexts get at the session
 * differently: a server component has only next/headers (getServerSession),
 * while a tRPC procedure holds the actual Request and must use auth(req).
 * Everything before that point - the provider check and the settings lookup -
 * is identical, and is the part that must not drift.
 */
export async function isGroupCreationAllowed(
  resolveSession: () => Promise<SessionLike> = getServerSession,
): Promise<boolean> {
  // Never consulted with no OIDC provider configured: the DB setting must not
  // be able to brick anonymous group creation when there is no way to sign in.
  if (env.OIDC_PROVIDERS.length === 0) return true

  const { requireLoginToCreateGroups } = await getInstanceSettings()
  if (!requireLoginToCreateGroups) return true

  return !!(await resolveSession())?.user?.id
}

/** What the groups list needs: whether to show login UI, and the create button. */
export async function getGroupCreationGate(): Promise<{
  enableLogin: boolean
  canCreateGroups: boolean
}> {
  const { enableLogin } = await getRuntimeFeatureFlags()
  return {
    enableLogin,
    canCreateGroups: enableLogin ? await isGroupCreationAllowed() : true,
  }
}

/**
 * Route guard for /groups/create. The only entry point (the Create button on
 * /groups) is already hidden in this state, so there is no UI state to design
 * here - just send them back.
 */
export async function redirectIfGroupCreationBlocked(): Promise<void> {
  if (!(await isGroupCreationAllowed())) redirect('/groups')
}
