import { env } from '@/lib/env'

const parseFlag = (val: string | undefined) =>
  ['true', 'yes', '1', 'on'].includes((val ?? '').trim().toLowerCase())

/**
 * Feature flags this fork adds, spread into upstream's getRuntimeFeatureFlags
 * so that src/lib/featureFlags.ts carries one line of ours instead of ten.
 */
export function forkFlags() {
  return {
    // Login/sync is fully hidden (no nav link, no sign-in UI, no sync banner)
    // unless at least one OIDC provider is configured - see env.ts's
    // oidcProviders for how providers get registered. Read from the parsed
    // snapshot rather than process.env: OIDC_PROVIDERS is a derived,
    // validated list, not a raw string.
    enableLogin: env.OIDC_PROVIDERS.length > 0,
    // /admin (read-only instance stats), like Traefik's own /dashboard
    // entrypoint - off by default, independent of enableLogin. Actual access
    // still requires an OIDC "admins" role grant (see admin/page.tsx).
    enableAdmin: parseFlag(process.env.ENABLE_ADMIN) || env.ENABLE_ADMIN,
  }
}
