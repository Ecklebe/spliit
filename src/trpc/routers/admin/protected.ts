import { auth, type Session } from '@/lib/auth'
import { env } from '@/lib/env'
import { baseProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'

/**
 * Admin procedure - mirrors /admin page's own three-layer gate exactly
 * (see app/admin/page.tsx): ENABLE_ADMIN opt-in, at least one OIDC provider
 * configured, and the "admins" role grant. NOT_FOUND (not UNAUTHORIZED) on
 * every failure, same reasoning as protectedProcedure in sync/protected.ts
 * - a disabled/unprivileged caller gets no signal this endpoint exists.
 */
export const adminProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!env.ENABLE_ADMIN || env.OIDC_PROVIDERS.length === 0) {
    throw new TRPCError({ code: 'NOT_FOUND' })
  }

  // Cast: see getServerSession()'s own comment in lib/auth.ts - auth()'s
  // declared return type resolves against a differently-versioned nested
  // @auth/core copy that src/types/auth.d.ts's module augmentation never
  // reaches, so `roles` isn't visible on it without this cast. ctx.req is
  // used directly (not getServerSession()'s headers()-based workaround)
  // since tRPC context already carries the real Request - same choice
  // protectedProcedure makes.
  const session = (await auth(ctx.req)) as unknown as Session | null

  if (!session?.user?.roles?.includes('admins')) {
    throw new TRPCError({ code: 'NOT_FOUND' })
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
