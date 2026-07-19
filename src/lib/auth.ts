import { env, oidcProviders } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import type { Adapter, AdapterUser } from '@auth/core/adapters'
import type { OIDCConfig } from '@auth/core/providers'
import Zitadel from '@auth/core/providers/zitadel'
import type { Session } from '@auth/core/types'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { NextAuth } from '@zitadel/next-auth'
import { headers } from 'next/headers'

// Extend PrismaAdapter to create a SyncProfile whenever a new user signs in
// for the first time.
const adapter = PrismaAdapter(prisma)
const extendedAdapter: Adapter = {
  ...adapter,
  async createUser(user: AdapterUser) {
    const createdUser = await adapter.createUser!(user)
    await prisma.syncProfile.create({
      data: { userId: createdUser.id },
    })
    return createdUser
  },
}

// One entry per id configured in OIDC_PROVIDERS. Zitadel gets Auth.js's
// built-in preset; any other id (Keycloak, Authentik, ...) is registered as
// a plain generic OIDC provider - both shapes are equally valid entries in
// the same `providers` array.
function buildProviders() {
  return oidcProviders.map(({ id, name, issuer, clientId, clientSecret }) => {
    if (id === 'zitadel') {
      return Zitadel({ clientId, clientSecret, issuer })
    }
    return {
      id,
      name,
      type: 'oidc',
      issuer,
      clientId,
      clientSecret,
    } satisfies OIDCConfig<Record<string, unknown>>
  })
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: extendedAdapter,
  providers: buildProviders(),
  secret: env.AUTH_SECRET,
  trustHost: true,
  session: {
    // Deliberately jwt, not database: keeps role claims (see callbacks
    // below) available without an extra persisted field, matches Zitadel's
    // own documented multi-provider example, and this feature is an
    // optional bonus on top of anonymous usage, not a security-critical
    // gate - instant server-side session revocation isn't a hard
    // requirement here the way it might be for the rest of the app.
    strategy: 'jwt',
  },
  pages: {
    signIn: '/settings',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        const roleClaim = profile['urn:zitadel:iam:org:project:roles'] as
          | Record<string, unknown>
          | undefined
        token.roles = roleClaim ? Object.keys(roleClaim) : []
      }
      return token
    },
    async session({ session, token }) {
      // Cast: @auth/core's own `session` callback param type intersects the
      // database- and jwt-strategy session shapes together, which loses our
      // module-augmented `roles` field on Session['user'] in a way plain
      // declaration merging doesn't fix. Purely a compile-time quirk - the
      // runtime object is the plain Session we augmented in types/auth.d.ts.
      const typedSession = session as unknown as Session
      if (typedSession.user) {
        typedSession.user.id = token.sub!
        typedSession.user.roles = (token.roles as string[] | undefined) ?? []
      }
      return typedSession
    },
  },
})

// auth() needs an explicit Request (see protected.ts/trpc's context
// threading), which Server Components - unlike Route Handlers - don't
// receive directly. next/headers' headers() carries the same session
// cookie, so a synthetic Request built from it is sufficient to decode the
// JWT session.
export async function getServerSession(): Promise<Session | null> {
  const session = await auth(
    new Request('http://localhost/', { headers: await headers() }),
  )
  // Cast: @zitadel/next-auth/@auth/prisma-adapter/our own direct dependency
  // each require a mutually-incompatible @auth/core version range (0.34.3
  // vs ^0.40.0 vs exactly 0.41.2), so npm nests three separate physical
  // copies of @auth/core instead of deduping to one. auth()'s declared
  // return type resolves against @zitadel/next-auth's own nested copy,
  // which src/types/auth.d.ts's module augmentation never reaches (it only
  // augments the top-level copy `Session` above is imported from) - same
  // root cause as the cast in the `session` callback further up. Consumers
  // should call this function (not `auth()` directly) to get the properly
  // roles-typed session without repeating this cast themselves.
  return session as unknown as Session | null
}

// Re-exported so callers needing to type a `useSession()` result (the
// client-side equivalent of this function) get the same augmented type
// without reaching into @auth/core/types directly.
export type { Session }
