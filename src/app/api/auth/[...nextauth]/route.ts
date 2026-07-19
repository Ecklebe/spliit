import { handlers } from '@/lib/auth'
import { env } from '@/lib/env'

// Fully hidden, not just unlinked, when no OIDC provider is configured -
// see featureFlags.ts's enableLogin.
const notFound = async () => new Response(null, { status: 404 })

// @auth/core's provider/callback-URL construction (parseProviders in
// lib/utils/providers.js) reads the incoming Request's `.url` directly -
// unlike its own createActionURL helper (used elsewhere for getSession/
// signIn/signOut), it does NOT consult AUTH_URL or x-forwarded-* headers.
// Behind this cluster's Traefik setup, Next.js's own Request.url for this
// route handler reflects the server's local bind address
// (http://localhost:3000/...), not the proxied host - so every OAuth
// redirect_uri Auth.js builds came out wrong regardless of AUTH_URL being
// set. Rewriting the request's origin to AUTH_URL here, before Auth.js
// ever sees it, fixes this at the one place it actually matters.
function withCorrectedOrigin<Req extends Request>(
  handler: (req: Req) => Promise<Response>,
) {
  return async (req: Req) => {
    if (!env.AUTH_URL) return handler(req)
    const origin = new URL(env.AUTH_URL).origin
    const incoming = new URL(req.url)
    if (incoming.origin === origin) return handler(req)
    const fixed = new URL(incoming.pathname + incoming.search, origin)
    // Cast: Next.js's NextRequest type adds a `nextUrl` field on top of the
    // standard Request shape, but @auth/core's actual runtime code (this
    // handler's only caller) only ever reads .url/.headers/.method/.body -
    // a plain Request is functionally sufficient here.
    return handler(
      new Request(fixed, {
        method: req.method,
        headers: req.headers,
        body: req.body,
        // @ts-expect-error - required by undici when the body is a stream
        duplex: req.body ? 'half' : undefined,
      }) as unknown as Req,
    )
  }
}

export const GET = env.OIDC_PROVIDERS.length > 0
  ? withCorrectedOrigin(handlers.GET)
  : notFound
export const POST = env.OIDC_PROVIDERS.length > 0
  ? withCorrectedOrigin(handlers.POST)
  : notFound
