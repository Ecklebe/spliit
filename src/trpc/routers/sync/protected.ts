import { getServerSession } from '@/lib/auth'
import { baseProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { getTranslations } from 'next-intl/server'

/**
 * Protected procedure that requires authentication
 * Throws UNAUTHORIZED error if user is not logged in
 */
export const protectedProcedure = baseProcedure.use(async ({ next }) => {
  const session = await getServerSession()
  const t = await getTranslations('SyncErrors')

  if (!session?.user?.email || !session?.user?.id) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: t('auth.required'),
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
