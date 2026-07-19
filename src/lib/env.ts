import { ZodIssueCode, z } from 'zod'

const interpretEnvVarAsBool = (val: unknown): boolean => {
  if (typeof val !== 'string') return false
  return ['true', 'yes', '1', 'on'].includes(val.toLowerCase())
}

const envSchema = z
  .object({
    POSTGRES_URL_NON_POOLING: z.string().url(),
    POSTGRES_PRISMA_URL: z.string().url(),
    NEXT_PUBLIC_BASE_URL: z
      .string()
      .optional()
      .default(
        process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000',
      ),
    NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS: z.preprocess(
      interpretEnvVarAsBool,
      z.boolean().default(false),
    ),
    NEXT_PUBLIC_S3_MAX_FILE_SIZE: z.preprocess((v) => {
      if (typeof v === 'string' && v.length) return Number(v)
      return undefined
    }, z.number().optional()),
    NEXT_PUBLIC_DEFAULT_CURRENCY_CODE: z.string().optional(),
    S3_UPLOAD_KEY: z.string().optional(),
    S3_UPLOAD_SECRET: z.string().optional(),
    S3_UPLOAD_BUCKET: z.string().optional(),
    S3_UPLOAD_REGION: z.string().optional(),
    S3_UPLOAD_ENDPOINT: z.string().optional(),
    NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT: z.preprocess(
      interpretEnvVarAsBool,
      z.boolean().default(false),
    ),
    NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT: z.preprocess(
      interpretEnvVarAsBool,
      z.boolean().default(false),
    ),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_BASE_URL: z.string().optional(),
    OPENAI_IMAGE_MODEL: z.string().optional(),
    OPENAI_TEXT_MODEL: z.string().optional(),
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
    ENABLE_ADMIN: z.preprocess(
      interpretEnvVarAsBool,
      z.boolean().default(false),
    ),
  })
  .superRefine((env, ctx) => {
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
    if (
      env.NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS &&
      // S3_UPLOAD_ENDPOINT is fully optional as it will only be used for providers other than AWS
      (!env.S3_UPLOAD_BUCKET ||
        !env.S3_UPLOAD_KEY ||
        !env.S3_UPLOAD_REGION ||
        !env.S3_UPLOAD_SECRET)
    ) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message:
          'If NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS is specified, then S3_* must be specified too',
      })
    }
    if (
      (env.NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT ||
        env.NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT) &&
      !env.OPENAI_API_KEY
    ) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message:
          'If NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT or NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT is specified, then OPENAI_API_KEY must be specified too',
      })
    }
  })

export const env = envSchema.parse(process.env)

export type OidcProviderConfig = {
  id: string
  name: string
  issuer: string
  clientId: string
  clientSecret: string
}

// One entry per id in OIDC_PROVIDERS, assembled from that id's companion
// OIDC_PROVIDER_<ID>_* vars (validated present above). Empty when
// OIDC_PROVIDERS is unset - this is the single source of truth for whether
// login/sync is enabled at all (env.OIDC_PROVIDERS.length > 0).
export const oidcProviders: OidcProviderConfig[] = env.OIDC_PROVIDERS.map(
  (id) => {
    const upper = id.toUpperCase()
    return {
      id,
      name: process.env[`OIDC_PROVIDER_${upper}_NAME`]!,
      issuer: process.env[`OIDC_PROVIDER_${upper}_ISSUER`]!,
      clientId: process.env[`OIDC_PROVIDER_${upper}_CLIENT_ID`]!,
      clientSecret: process.env[`OIDC_PROVIDER_${upper}_CLIENT_SECRET`]!,
    }
  },
)
