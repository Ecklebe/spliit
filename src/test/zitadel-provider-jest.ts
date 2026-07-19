// @auth/core/providers/zitadel ships ESM-only (no CJS build at all), which
// breaks Jest's default CJS transform if imported from any module reachable
// by src/trpc/routers/_app.test.ts (src/lib/auth.ts, in this case). Same
// class of issue as next-intl/server and nanoid elsewhere in this codebase,
// fixed the same way jest.config.ts already fixes superjson: map the real
// module to a plain CJS-compatible shim for tests only. This mirrors the
// actual (trivially simple) implementation of @auth/core's zitadel preset -
// see its source for confirmation.
export default function ZITADEL(options: Record<string, unknown>) {
  return {
    id: 'zitadel',
    name: 'ZITADEL',
    type: 'oidc',
    options,
  }
}
