import { auth } from '@/lib/auth'
import { env } from '@/lib/env'
import { baseProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'

/**
 * Protected procedure that requires authentication
 * Throws UNAUTHORIZED error if user is not logged in
 */
export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  // Fully hidden, not just unlinked, when no OIDC provider is configured -
  // see featureFlags.ts's enableLogin. NOT_FOUND rather than UNAUTHORIZED
  // so a disabled instance gives no signal that this feature exists at all.
  if (env.OIDC_PROVIDERS.length === 0) {
    throw new TRPCError({ code: 'NOT_FOUND' })
  }

  const session = await auth(ctx.req)

  if (!session?.user?.email || !session?.user?.id) {
    // Not translated: server-side thrown error messages aren't translated
    // anywhere else in this codebase either (e.g. api.ts's "Invalid group
    // ID"/"Invalid participant ID" errors) - also sidesteps next-intl/server
    // being ESM-only with no CJS build, which breaks Jest if imported from
    // a module reachable by src/trpc/routers/_app.test.ts.
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    })
  }

  return next({
    ctx: {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
    },
  })
})
