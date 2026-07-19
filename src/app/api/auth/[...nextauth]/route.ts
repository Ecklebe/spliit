import { handlers } from '@/lib/auth'
import { env } from '@/lib/env'

// Fully hidden, not just unlinked, when no OIDC provider is configured -
// see featureFlags.ts's enableLogin.
const notFound = async () => new Response(null, { status: 404 })

export const GET = env.OIDC_PROVIDERS.length > 0 ? handlers.GET : notFound
export const POST = env.OIDC_PROVIDERS.length > 0 ? handlers.POST : notFound
