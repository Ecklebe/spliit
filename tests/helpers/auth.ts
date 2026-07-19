import { expect, Page } from '@playwright/test'
import { readdir, readFile, rm } from 'fs/promises'
import path from 'path'

/**
 * Helper to read the most recent email from .mail/ directory
 * Returns the email content
 */
export async function readRecentEmail(mailAddress: string): Promise<string> {
  const mailDir = path.join(process.cwd(), '.mail')
  const files = await readdir(mailDir)

  // Filter .eml files and sort by name (which includes timestamp)
  const normalizedEmail = mailAddress.replace(/[^a-zA-Z0-9@.-]/g, '_').toLowerCase()
  const emlFiles = files
    .filter((f) => f.endsWith(`${normalizedEmail}.eml`))
    .sort()
    .reverse()

  if (emlFiles.length === 0) {
    throw new Error(`No emails found in .mail/ directory for ${normalizedEmail}`)
  }

  const latestFile = emlFiles[0]!
  const content = await readFile(path.join(mailDir, latestFile), 'utf-8')
  // cleanup
  rm(path.join(mailDir, latestFile)).catch(() => {
    console.warn(`Failed to delete email file: ${latestFile}`)
  })
  return content
}

/**
 * Extract magic link URL from email content
 */
export function extractMagicLinkFromEmail(emailContent: string): string {
  // Look for URL pattern in the email
  const urlMatch = emailContent.match(/https?:\/\/[^\s<>"]+/g)

  if (!urlMatch || urlMatch.length === 0) {
    throw new Error('No URL found in email content')
  }

  // Find the callback URL (contains callbackUrl or token)
  const magicLink = urlMatch.find(
    (url) =>
      url.includes('callback') ||
      url.includes('token') ||
      url.includes('/api/auth'),
  )

  if (!magicLink) {
    throw new Error('No magic link found in email')
  }

  return magicLink
}

/**
 * Sign in using magic link flow
 * 1. Navigate to /settings
 * 2. Enter email
 * 3. Click send magic link
 * 4. Read .mail/ for link
 * 5. Navigate to link
 * 6. Verify signed in
 */
export async function signInWithMagicLink(
  page: Page,
  email: string,
): Promise<{usedMagicLink: string}> {
  await page.goto('/settings')

  // Enter email
  const emailInput = page.getByRole('textbox', { name: 'Email' })
  await expect(emailInput).toBeVisible()
  await emailInput.fill(email)

  // Click send magic link
  const sendButton = page.getByRole('button', { name: /send magic link/i })
  await sendButton.click()

  // Wait for confirmation message
  await expect(page.getByText(/check your email/i)).toBeVisible()

  // Wait a bit for email to be written
  await page.waitForTimeout(1000)

  // Read email and extract link
  const emailContent = await readRecentEmail(email)
  const magicLink = extractMagicLinkFromEmail(emailContent)

  // Navigate to magic link and wait for auth to complete
  const response = await page.goto(magicLink, { waitUntil: 'networkidle' })

  // NextAuth will redirect to the callback URL after successful authentication
  // Wait for either redirect or load to complete
  await expect(page.getByText('Signed in as')).toBeVisible()
  // Verify signed in by checking for sign out button
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
  return { usedMagicLink: magicLink }
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
