import { ZodIssueCode, z } from 'zod'
import { ANALYTICS_PROVIDER_IDS } from './analytics/provider-ids'

const interpretEnvVarAsBool = (val: unknown): boolean => {
  if (typeof val !== 'string') return false
  // .trim() guards against trailing whitespace such as the CR from a CRLF
  // (Windows) .env file, which would otherwise make "true\r" !== "true".
  return ['true', 'yes', '1', 'on'].includes(val.trim().toLowerCase())
}

/**
 * Treats a blank environment variable as unset, so that listing a variable
 * without a value (as `scripts/build.env` does) is not the same as giving it an
 * empty value — which would fail validations like `z.string().url()`.
 */
const interpretBlankEnvVarAsUndefined = (val: unknown): unknown =>
  typeof val === 'string' && val.trim() === '' ? undefined : val

const envSchema = z
  .object({
    POSTGRES_URL_NON_POOLING: z.string().url(),
    POSTGRES_PRISMA_URL: z.string().url(),
    // Runtime override for the public base URL, so a prebuilt image can be
    // told where it is reachable without a rebuild. Takes precedence over
    // NEXT_PUBLIC_BASE_URL, which is baked in at build time.
    BASE_URL: z.preprocess(
      interpretBlankEnvVarAsUndefined,
      z.string().trim().url().optional(),
    ),
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
    // Runtime (non-public) counterpart. Next.js inlines NEXT_PUBLIC_* vars into
    // the bundle at build time, so they can never be changed in a prebuilt
    // image; this one is read from the environment at runtime and can be
    // toggled with `docker run -e ...`. Enabling either variable enables the
    // feature, so existing NEXT_PUBLIC_* configuration keeps working.
    ENABLE_EXPENSE_DOCUMENTS: z.preprocess(
      interpretEnvVarAsBool,
      z.boolean().default(false),
    ),
    // Runtime override for the currency pre-selected on the new-group form.
    // Takes precedence over NEXT_PUBLIC_DEFAULT_CURRENCY_CODE.
    DEFAULT_CURRENCY_CODE: z.preprocess(
      interpretBlankEnvVarAsUndefined,
      z.string().trim().optional(),
    ),
    NEXT_PUBLIC_DEFAULT_CURRENCY_CODE: z.string().optional(),
    S3_UPLOAD_KEY: z.string().optional(),
    S3_UPLOAD_SECRET: z.string().optional(),
    S3_UPLOAD_BUCKET: z.string().optional(),
    S3_UPLOAD_REGION: z.string().optional(),
    S3_UPLOAD_ENDPOINT: z.string().optional(),
    // Client-side guard for the backend-mediated upload path (see PR #499):
    // the browser refuses oversized files before requesting a presigned URL.
    NEXT_PUBLIC_S3_MAX_FILE_SIZE: z.preprocess((v) => {
      if (typeof v === 'string' && v.length) return Number(v)
      return undefined
    }, z.number().optional()),
    NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT: z.preprocess(
      interpretEnvVarAsBool,
      z.boolean().default(false),
    ),
    // Runtime (non-public) counterpart, see ENABLE_EXPENSE_DOCUMENTS above.
    ENABLE_RECEIPT_EXTRACT: z.preprocess(
      interpretEnvVarAsBool,
      z.boolean().default(false),
    ),
    NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT: z.preprocess(
      interpretEnvVarAsBool,
      z.boolean().default(false),
    ),
    // Runtime (non-public) counterpart, see ENABLE_EXPENSE_DOCUMENTS above.
    ENABLE_CATEGORY_EXTRACT: z.preprocess(
      interpretEnvVarAsBool,
      z.boolean().default(false),
    ),
    // .trim() guards against a trailing CR from a CRLF (Windows) .env file: a
    // key ending in "\r" would otherwise fail authentication with a 401.
    OPENAI_API_KEY: z.string().trim().optional(),
    // Optional OpenAI-compatible endpoint (a self-hosted or alternative
    // provider). When unset the SDK's default — the official API — is used.
    OPENAI_BASE_URL: z.preprocess(
      interpretBlankEnvVarAsUndefined,
      z.string().trim().url().optional(),
    ),
    // The models each feature uses. Both default to what the code used before
    // they were configurable; a provider set through OPENAI_BASE_URL will
    // almost certainly need different names.
    OPENAI_MODEL_RECEIPT_EXTRACT: z.preprocess(
      interpretBlankEnvVarAsUndefined,
      z.string().trim().default('gpt-5-nano'),
    ),
    OPENAI_MODEL_CATEGORY_EXTRACT: z.preprocess(
      interpretBlankEnvVarAsUndefined,
      z.string().trim().default('gpt-5-nano'),
    ),
    // Analytics is disabled unless a provider is selected. These are read on
    // the server and passed to the client as props, so they are deliberately
    // not `NEXT_PUBLIC_`: a single image stays configurable at container start.
    ANALYTICS_PROVIDER: z.preprocess(
      interpretBlankEnvVarAsUndefined,
      z.enum(ANALYTICS_PROVIDER_IDS).optional(),
    ),
    PLAUSIBLE_DOMAIN: z.preprocess(
      interpretBlankEnvVarAsUndefined,
      z.string().optional(),
    ),
    PLAUSIBLE_HOST: z.preprocess(
      interpretBlankEnvVarAsUndefined,
      z.string().url().optional(),
    ),
    // Not a `z.string().url()`: both are usually relative paths, pointing at
    // rewrites that serve Plausible first-party.
    PLAUSIBLE_SCRIPT_URL: z.preprocess(
      interpretBlankEnvVarAsUndefined,
      z.string().optional(),
    ),
    PLAUSIBLE_API_URL: z.preprocess(
      interpretBlankEnvVarAsUndefined,
      z.string().optional(),
    ),
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
    // Either spelling enables the feature, so either has to satisfy the
    // dependency checks below.
    const enableExpenseDocuments =
      env.ENABLE_EXPENSE_DOCUMENTS || env.NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS
    const enableReceiptExtract =
      env.ENABLE_RECEIPT_EXTRACT || env.NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT
    const enableCategoryExtract =
      env.ENABLE_CATEGORY_EXTRACT || env.NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT
    if (
      enableExpenseDocuments &&
      // S3_UPLOAD_ENDPOINT is fully optional as it will only be used for providers other than AWS
      (!env.S3_UPLOAD_BUCKET ||
        !env.S3_UPLOAD_KEY ||
        !env.S3_UPLOAD_REGION ||
        !env.S3_UPLOAD_SECRET)
    ) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message:
          'If ENABLE_EXPENSE_DOCUMENTS is set, then S3_* must be set too',
      })
    }
    if (
      (enableReceiptExtract || enableCategoryExtract) &&
      !env.OPENAI_API_KEY
    ) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message:
          'If ENABLE_RECEIPT_EXTRACT or ENABLE_CATEGORY_EXTRACT is set, then OPENAI_API_KEY must be set too',
      })
    }
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
    if (env.ANALYTICS_PROVIDER === 'plausible' && !env.PLAUSIBLE_DOMAIN) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message:
          'If ANALYTICS_PROVIDER is set to "plausible", then PLAUSIBLE_DOMAIN must be specified too',
      })
    }
  })

export const env = envSchema.parse(process.env)

// The base URL to use everywhere: the runtime override when set, otherwise the
// value baked in at build time.
export const effectiveBaseUrl = env.BASE_URL ?? env.NEXT_PUBLIC_BASE_URL

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
