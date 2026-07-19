import '@auth/core/types'

declare module '@auth/core/types' {
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
      roles: string[]
    }
    // The raw OIDC id_token, needed client-side to build the RP-initiated
    // logout redirect (id_token_hint) - see account-info.tsx's full sign-out
    // flow. Only present for providers that return one (all our OIDC/OIDC-
    // preset providers do).
    idToken?: string
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    roles?: string[]
    idToken?: string
  }
}
