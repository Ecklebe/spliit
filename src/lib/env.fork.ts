import { ZodIssueCode, z } from 'zod'

/**
 * Everything this fork adds to upstream's environment schema, kept in its own
 * module so src/lib/env.ts stays a three-line diff against upstream rather
 * than an 86-line one: `forkEnvFields` is spread into the schema object and
 * `forkEnvRefinements` is called from its superRefine.
 *
 * The derived `oidcProviders` list deliberately stays in env.ts - it reads the
 * parsed `env`, so moving it here would make the two modules circular.
 */
const interpretEnvVarAsBool = (val: unknown): boolean => {
  if (typeof val !== 'string') return false
  // .trim() guards against a trailing CR from a CRLF (Windows) .env file.
  return ['true', 'yes', '1', 'on'].includes(val.trim().toLowerCase())
}

export const forkEnvFields = {
  // Client-side guard for the backend-mediated upload path (see PR #499):
  // the browser refuses oversized files before requesting a presigned URL.
  NEXT_PUBLIC_S3_MAX_FILE_SIZE: z.preprocess((v) => {
    if (typeof v === 'string' && v.length) return Number(v)
    return undefined
  }, z.number().optional()),
  // Login / group sync (optional - anonymous, URL-based group access always
  // works regardless of this; signing in only unlocks syncing your own
  // groups across devices). Auth is handed off entirely to one or more
  // OIDC providers, registered by id via OIDC_PROVIDERS - see oidcProviders
  // below for how each id's companion vars get assembled.
  AUTH_SECRET: z.string().optional(),
  // Strongly recommended whenever OIDC_PROVIDERS is set and the app runs
  // behind a reverse proxy - see the route handler
  // (api/auth/[...nextauth]/route.ts) for why: @auth/core's own
  // header-based origin detection doesn't cover the code path that builds
  // OAuth redirect_uris, so without this every provider's redirect_uri
  // comes out as whatever Next.js's own local bind address is, not the
  // real external host.
  AUTH_URL: z.string().url().optional(),
  OIDC_PROVIDERS: z
    .string()
    .optional()
    .default('')
    .transform((val) =>
      val
        .split(',')
        .map((id) => id.trim().toLowerCase())
        .filter(Boolean),
    ),
  // /admin (read-only instance stats) is off by default, same as Traefik's
  // own /dashboard entrypoint - an operator opts in explicitly. When on,
  // access is still gated by an OIDC "admin" role grant (see
  // auth.ts/getServerSession) - enabling this with no OIDC provider
  // configured just leaves the page permanently unreachable, since no one
  // can ever hold that role without a login path.
  ENABLE_ADMIN: z.preprocess(interpretEnvVarAsBool, z.boolean().default(false)),
}

export function forkEnvRefinements(
  env: { OIDC_PROVIDERS: string[]; AUTH_SECRET?: string },
  ctx: z.RefinementCtx,
) {
  if (env.OIDC_PROVIDERS.length > 0 && !env.AUTH_SECRET) {
    ctx.addIssue({
      code: ZodIssueCode.custom,
      message:
        'If OIDC_PROVIDERS is specified, then AUTH_SECRET must be specified too',
    })
  }
  for (const id of env.OIDC_PROVIDERS) {
    const upper = id.toUpperCase()
    const missing = ['NAME', 'ISSUER', 'CLIENT_ID', 'CLIENT_SECRET'].filter(
      (suffix) => !process.env[`OIDC_PROVIDER_${upper}_${suffix}`],
    )
    if (missing.length > 0) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: `OIDC provider "${id}" is listed in OIDC_PROVIDERS but missing: ${missing
          .map((suffix) => `OIDC_PROVIDER_${upper}_${suffix}`)
          .join(', ')}`,
      })
    }
  }
}
