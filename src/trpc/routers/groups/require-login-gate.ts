import { auth } from '@/lib/auth'
import { isGroupCreationAllowed } from '@/lib/fork/group-creation'
import { TRPCError } from '@trpc/server'

/**
 * Enforces the admin-configurable "require login to create groups" setting
 * (see /admin) for any procedure that creates a new Group row. Shared by
 * groups.create and groups.importFromFile - both call prisma.group.create
 * via createGroup() in api.ts and must be gated identically, since leaving
 * either one ungated would make the setting trivially bypassable.
 *
 * Only consulted when at least one OIDC provider is actually configured -
 * with none configured, the DB setting must never brick anonymous group
 * creation for everyone with no way left to sign in.
 *
 * Tradeoff: this is a DB round-trip on every group-creation call rather
 * than an in-memory cache. Deliberate - the whole point of this feature is
 * runtime mutability with no redeploy, and a process-local cache would
 * either reintroduce that staleness or need real invalidation plumbing. A
 * single indexed PK lookup on a 1-row table is negligible at this app's
 * self-hosted, low-traffic scale.
 */
export async function assertGroupCreationAllowed(req: Request) {
  // Same predicate the groups list and the create page use, with this
  // context's own session source - see @/lib/fork/group-creation.
  if (await isGroupCreationAllowed(() => auth(req))) return

  // Not translated - server-side thrown error messages aren't translated
  // anywhere else in this codebase either (see protectedProcedure's own
  // comment on this in sync/protected.ts).
  throw new TRPCError({
    code: 'UNAUTHORIZED',
    message: 'You must be logged in to create a new group',
  })
}
