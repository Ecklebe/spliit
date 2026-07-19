import { prisma } from '@/lib/prisma'
import { encode } from '@auth/core/jwt'
import { expect, Page } from '@playwright/test'

/**
 * Signs a page in as a fresh test user, bypassing the real OIDC flow
 * entirely - there's no live IdP to script against in this test
 * environment (see .env.example's OIDC_PROVIDERS docs). Mints a session
 * cookie directly with AUTH_SECRET, the same way @auth/core signs one
 * for a real sign-in (jwt.encode, salted with the session cookie's own
 * name - see @auth/core/lib/actions/callback/index.js).
 *
 * Also seeds the User + SyncProfile rows a real sign-in would create via
 * the PrismaAdapter (src/lib/auth.ts's extendedAdapter.createUser) - the
 * sync router's procedures expect a SyncProfile to already exist for the
 * session's user id.
 */
export async function signInAsTestUser(
  page: Page,
  email: string,
): Promise<{ userId: string }> {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error(
      'AUTH_SECRET must be set in the test environment to mint session cookies (see .env.example)',
    )
  }

  // Upsert, not create: tests that sign in with the same email on a
  // second "device" (a fresh browser context) expect the same identity
  // and synced state, not a brand new user.
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name: email.split('@')[0] },
    update: {},
  })
  await prisma.syncProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  })

  await page.goto('/')
  const baseUrl = new URL(page.url())
  const secure = baseUrl.protocol === 'https:'
  const cookieName = secure
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token'

  const token = await encode({
    secret,
    salt: cookieName,
    token: {
      sub: user.id,
      email: user.email,
      roles: [],
    },
  })

  await page.context().addCookies([
    {
      name: cookieName,
      value: token,
      domain: baseUrl.hostname,
      path: '/',
      httpOnly: true,
      secure,
      sameSite: 'Lax',
    },
  ])
  await page.reload()

  return { userId: user.id }
}

/**
 * Sign out from the app
 */
export async function signOut(
  page: Page,
  clearLocalData: boolean = false,
): Promise<void> {
  await page.goto('/settings')

  const signOutButton = page.getByRole('button', { name: /sign out|log out/i })
  await signOutButton.click()

  if (clearLocalData) {
    // If a dialog appears, choose to clear data
    const clearButton = page.getByRole('button', { name: /clear|yes/i })
    if (await clearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await clearButton.click()
    }
  } else {
    // Choose to keep data
    const keepButton = page.getByRole('button', { name: /keep|no/i })
    if (await keepButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await keepButton.click()
    }
  }

  // Wait for sign out to complete
  await expect(page.getByText('Sign in to sync your groups')).toBeVisible();
}

/**
 * Check if user is signed in
 */
export async function isSignedIn(page: Page): Promise<boolean> {
  await page.goto('/settings')
  const signedOutElement = page.getByText('Sign in to sync your groups')
  const signedInElement = page.getByText('Signed in as')
  return Promise.race([
    signedInElement.waitFor({state: 'visible'}).then(() => true),
    signedOutElement.waitFor({state: 'visible'}).then(() => false)
  ])
}
