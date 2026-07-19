// @zitadel/next-auth ships ESM-only with no "require" condition in its
// package.json exports map at all (Jest can't even resolve it, let alone
// transform it) - same class of issue as the zitadel provider / prisma
// adapter shims next to this file. src/lib/auth.ts only destructures
// {handlers, auth, signIn, signOut} from the return value; none of
// _app.test.ts's cases exercise real sign-in, so stubs that keep
// protectedProcedure's "no session" path working are sufficient.
export function NextAuth() {
  return {
    handlers: {
      GET: async () => new Response(null, { status: 404 }),
      POST: async () => new Response(null, { status: 404 }),
    },
    auth: async () => null,
    signIn: async () => {
      throw new Error('signIn is not available in tests')
    },
    signOut: async () => {
      throw new Error('signOut is not available in tests')
    },
  }
}
