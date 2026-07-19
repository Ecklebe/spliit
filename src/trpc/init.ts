import { Prisma } from '@prisma/client'
import { initTRPC } from '@trpc/server'
import { cache } from 'react'
import superjson from 'superjson'

superjson.registerCustom<Prisma.Decimal, string>(
  {
    isApplicable: (v): v is Prisma.Decimal => Prisma.Decimal.isDecimal(v),
    serialize: (v) => v.toJSON(),
    deserialize: (v) => new Prisma.Decimal(v),
  },
  'decimal.js',
)

export const createTRPCContext = cache(async (opts: { req: Request }) => {
  /**
   * @see: https://trpc.io/docs/server/context
   *
   * Exposes the raw Request so protectedProcedure (sync router) can call
   * @zitadel/next-auth's auth(req) - unlike NextAuth v5's own auth(), this
   * package's session lookup takes the request explicitly rather than
   * reading it implicitly via Next.js's async-local-storage headers().
   */
  return { req: opts.req }
})

// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create({
    /**
     * @see https://trpc.io/docs/server/data-transformers
     */
    transformer: superjson,
  })

// Base router and procedure helpers
export const createTRPCRouter = t.router
export const baseProcedure = t.procedure
