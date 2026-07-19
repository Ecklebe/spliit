'use server'

import { env } from './env'

export async function getRuntimeFeatureFlags() {
  return {
    enableExpenseDocuments: env.NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS,
    enableReceiptExtract: env.NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT,
    enableCategoryExtract: env.NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT,
    // Login/sync is fully hidden (no nav link, no sign-in UI, no sync
    // banner) unless at least one OIDC provider is configured - see
    // env.ts's oidcProviders for how providers get registered.
    enableLogin: env.OIDC_PROVIDERS.length > 0,
    // /admin (read-only instance stats), like Traefik's own /dashboard
    // entrypoint - off by default, independent of enableLogin. Actual
    // access still requires an OIDC "admin" role grant (see admin/page.tsx).
    enableAdmin: env.ENABLE_ADMIN,
  }
}

export type RuntimeFeatureFlags = Awaited<
  ReturnType<typeof getRuntimeFeatureFlags>
>
