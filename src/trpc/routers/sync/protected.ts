import { getServerSession } from '@/lib/auth'
import { baseProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'

/**
 * Protected procedure that requires authentication
 * Throws UNAUTHORIZED error if user is not logged in
 */
export const protectedProcedure = baseProcedure.use(async ({ next }) => {
  const session = await getServerSession()

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
