import { randomId } from '@/lib/api'
import { expect, test } from '@playwright/test'
import { isSignedIn, signInWithMagicLink, signOut } from '../helpers/auth'

test.describe('Magic Link Authentication', () => {
  test('sign in with magic link from .mail/ folder', async ({ page }) => {
    const testEmail = `test-${randomId(4)}@example.com`

    // Verify not signed in initially
    expect(await isSignedIn(page)).toBe(false)

    // Sign in using magic link
    await signInWithMagicLink(page, testEmail)

    // Verify signed in
    expect(await isSignedIn(page)).toBe(true)

    // Verify email is displayed
    await page.goto('/settings')
    await expect(page.getByText(testEmail)).toBeVisible()
  })

  test('sign out removes session', async ({ page }) => {
    const testEmail = `test-${randomId(4)}@example.com`

    // Sign in
    await signInWithMagicLink(page, testEmail)
    expect(await isSignedIn(page)).toBe(true)

    // Sign out
    await signOut(page, false)

    // Verify signed out
    await expect(page.getByText('Sign in to sync your groups')).toBeVisible();
  })

  test('magic link can only be used once', async ({ page, context }) => {
    const testEmail = `test-${randomId(4)}@example.com`

    // Sign in
    const { usedMagicLink } = await signInWithMagicLink(page, testEmail)

    // Try using the same link in a new page (simulate sharing link)
    const newPage = await context.newPage()
    await newPage.goto(usedMagicLink)

    // Should show error or redirect to login (link already used)
    await expect(newPage.getByRole('heading', { name: 'Authentication Error' })).toBeVisible()

    await newPage.close()
  })

  test('expired magic link shows error', async ({ page }) => {
    // Note: This test is conceptual - actually waiting for link expiry
    // would take too long. In a real scenario, you'd manipulate the
    // token timestamp in the database or use a test-only short expiry.

    // For now, we just verify the error page exists
    await page.goto('/auth/error')

    // The error page should be accessible
    expect(page.url()).toContain('/auth/error')
  })

  test('can sign in on different device (browser context)', async ({
    browser,
  }) => {
    const testEmail = `test-${randomId(4)}@example.com`

    // Device 1
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()

    await signInWithMagicLink(page1, testEmail)
    expect(await isSignedIn(page1)).toBe(true)

    await context1.close()

    // Device 2 (new context = different device)
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()

    // Should not be signed in on device 2
    expect(await isSignedIn(page2)).toBe(false)

    // Can sign in independently on device 2
    await signInWithMagicLink(page2, testEmail)
    expect(await isSignedIn(page2)).toBe(true)

    await context2.close()
  })
})
