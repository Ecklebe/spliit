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
      // checks: @auth/core only auto-adds a `state` check when
      // redirectProxyUrl is set (an unrelated multi-instance feature we
      // don't use) - otherwise it relies on PKCE alone (its own default is
      // checks: ['pkce']). Most providers tolerate a bare PKCE flow with no
      // state param, but some (Authelia included) strictly require state to
      // be present and at least 8 characters, rejecting the authorization
      // request outright otherwise - adding both checks explicitly keeps
      // this working across any configured provider, not just the lenient
      // ones.
      return Zitadel({
        clientId,
        clientSecret,
        issuer,
        checks: ['pkce', 'state'],
      })
    }
    return {
      id,
      name,
      type: 'oidc',
      issuer,
      clientId,
      clientSecret,
      checks: ['pkce', 'state'],
      // Request a `groups` scope/claim on top of the OIDC defaults -
      // Authelia (and a number of other generic OIDC providers) expose
      // group membership this way. Zitadel has its own dedicated nested
      // roles claim instead (handled separately below), so this only
      // matters for non-Zitadel providers.
      authorization: { params: { scope: 'openid profile email groups' } },
      // @auth/core trusts the ID token's own claims by default and only
      // calls the userinfo endpoint when idToken is explicitly false.
      // Authelia's ID token is minimal (no email/groups in it at all -
      // confirmed live: account creation failed with "Argument `email` is
      // missing" even though the `email` scope was granted) and puts the
      // full profile in the userinfo response instead, per its own
      // discovery document. Forcing the userinfo round-trip keeps this
      // working for any provider that draws the same minimal-ID-token/
      // full-userinfo distinction, not just Authelia.
      idToken: false,
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
    async jwt({ token, account, profile }) {
      if (profile) {
        // Zitadel asserts a nested role -> {org_id: org_name} object under
        // this claim key; most other OIDC providers (Authelia included)
        // expose group membership as a flat `groups` array claim instead -
        // support both rather than assuming Zitadel's shape everywhere.
        const zitadelRoleClaim = profile[
          'urn:zitadel:iam:org:project:roles'
        ] as Record<string, unknown> | undefined
        const flatGroups = profile.groups
        token.roles = zitadelRoleClaim
          ? Object.keys(zitadelRoleClaim)
          : Array.isArray(flatGroups)
            ? (flatGroups as string[])
            : []
      }
      // account is only present on the initial sign-in exchange (same as
      // profile above) - id_token is needed for RP-initiated logout (see
      // account-info.tsx), since without it we can only clear our own local
      // session, leaving the provider's own SSO session alive so the next
      // sign-in silently re-authenticates with no credential prompt.
      if (account?.id_token) {
        token.idToken = account.id_token as string
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
      typedSession.idToken = token.idToken as string | undefined
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
