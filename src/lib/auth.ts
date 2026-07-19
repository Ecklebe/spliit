import { env, oidcProviders } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import type { Adapter, AdapterUser } from '@auth/core/adapters'
import type { OIDCConfig } from '@auth/core/providers'
import Zitadel from '@auth/core/providers/zitadel'
import type { Session } from '@auth/core/types'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { NextAuth } from '@zitadel/next-auth'

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
