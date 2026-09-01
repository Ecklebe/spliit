// RP-initiated (OIDC) logout: clearing our own session cookie alone leaves
// the provider's own SSO session alive, so a subsequent sign-in silently
// re-authenticates with no credential prompt - the provider's own logout/
// account page has to be visited too. Generic across any configured OIDC
// provider (not Zitadel-specific): the end_session_endpoint is read from
// the issuer's own discovery document rather than assumed, since RP-
// initiated logout endpoint paths aren't standardized across providers.

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    )
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function buildEndSessionUrl(
  idToken: string,
  postLogoutRedirectUri: string,
): Promise<string | null> {
  const issuer = decodeJwtPayload(idToken)?.iss as string | undefined
  if (!issuer) return null

  try {
    const res = await fetch(`${issuer}/.well-known/openid-configuration`)
    if (!res.ok) return null
    const config = (await res.json()) as { end_session_endpoint?: string }
    if (!config.end_session_endpoint) return null

    const url = new URL(config.end_session_endpoint)
    url.searchParams.set('id_token_hint', idToken)
    url.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri)
    return url.toString()
  } catch {
    return null
  }
}

// Clears the local Spliit session via a direct fetch rather than
// @zitadel/next-auth/react's own signOut(), which submits a real <form> and
// navigates immediately - incompatible with also redirecting to the OIDC
// provider's end-session endpoint afterward. X-Auth-Return-Redirect makes
// Auth.js return JSON instead of performing its own redirect.
export async function clearLocalSession(): Promise<void> {
  const csrfRes = await fetch('/api/auth/csrf')
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string }
  await fetch('/api/auth/signout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Auth-Return-Redirect': '1',
    },
    body: new URLSearchParams({ csrfToken }),
  })
}
