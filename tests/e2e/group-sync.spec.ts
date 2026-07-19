import { randomId } from '@/lib/api'
import { expect, test } from '@playwright/test'
import { signInWithMagicLink, signOut } from '../helpers/auth'
import { createGroupViaAPI } from '../helpers/batch-api'
import { createGroup } from '../helpers'

test.describe('Group Cloud Sync', () => {
  test('sync and unsync group flow', async ({ page }) => {
    const testEmail = `test-${randomId(4)}@example.com`
    await signInWithMagicLink(page, testEmail)

    // Create a group
    const groupName = `Sync Test ${randomId(4)}`
    const groupId = await createGroup({page, groupName, participants: ['Alice', 'Bob']})

    // Go to groups list where sync buttons are
    await page.goto('/groups')
    await expect(page.getByRole('link', { name: groupName })).toBeVisible()

    // Find the sync button (cloud icon) for the group
    // The sync button is an icon button with a cloud icon
    const syncButton = page
      .getByRole('button', { name: 'Sync to cloud' })
      .first()
    await expect(syncButton).toBeVisible()
    await syncButton.click()

    // Wait for sync to complete
    await page.waitForTimeout(1000)

    // Verify synced state - should show blue cloud icon
    const unsyncButton = page.locator('svg.lucide-cloud.text-blue-500').first()
    await expect(unsyncButton).toBeVisible()

    // Click unsync (the blue cloud button)
    await unsyncButton.click()
    // Verify unsynced state - should show cloud-off icon again
    await expect(page.locator('svg.lucide-cloud-off').first()).toBeVisible()
  })

  test('auto-sync new groups when preference enabled', async ({ page }) => {
    const testEmail = `test-${randomId(4)}@example.com`
    await signInWithMagicLink(page, testEmail)

    // Enable auto-sync preference
    await page.goto('/settings')

    // Find and enable the auto-sync toggle switch if not already enabled
    const autoSyncToggle = page.locator('button[role="switch"]').first()
    await expect(autoSyncToggle).toBeVisible()

    const isChecked = await autoSyncToggle.getAttribute('data-state')
    if (isChecked !== 'checked') {
      await autoSyncToggle.click()
    }
    await expect(autoSyncToggle).toHaveAttribute('data-state', 'checked')

    // Create a new group via UI (not API) to trigger auto-sync
    const groupName = `Auto Sync Test ${randomId(4)}`
    await createGroup({page, groupName, participants: ['Alice', 'Bob']})

    // Go to groups list to check sync status
    await page.goto('/groups')

    // Group should be auto-synced - look for blue cloud icon
    const groupCard = page.locator(`li:has-text("${groupName}")`).first()
    await expect(
      groupCard.locator('svg.lucide-cloud.text-blue-500').first(),
    ).toBeVisible()
  })

  test('hydration merges local and server groups on sign-in', async ({
    page,
  }) => {
    // First navigate to a page to establish http:// context
    await page.goto('/groups')

    // Create local groups before sign-in
    const localGroup1Name = `Local ${randomId(4)}`
    const localGroup2Name = `Local ${randomId(4)}`

    await createGroupViaAPI(page, localGroup1Name, ['Alice', 'Bob'])
    await createGroupViaAPI(page, localGroup2Name, ['Charlie', 'Dave'])

    // Sign in (will trigger hydration)
    const testEmail = `test-${randomId(4)}@example.com`
    await signInWithMagicLink(page, testEmail)

    // Go to groups page
    await page.goto('/groups')

    // Both local groups should still be visible
    await expect(page.getByText(localGroup1Name)).toBeVisible()
    await expect(page.getByText(localGroup2Name)).toBeVisible()
  })

  test('starred and archived sync across devices', async ({ browser }) => {
    const testEmail = `test-${randomId(4)}@example.com`

    // Device 1: Sign in and star a group
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()

    await signInWithMagicLink(page1, testEmail)
    const groupName = `Star Test ${randomId(4)}`
    const groupId = await createGroupViaAPI(page1, groupName, ['Alice', 'Bob'])

    await page1.goto(`/groups`)

    // Cloud sync the group first
    const syncButton = page1
      .getByRole('button', { name: 'Sync to cloud' })
      .first()
    await expect(syncButton).toBeVisible()
    await syncButton.click()
    await expect(page1.locator('svg.lucide-cloud.text-blue-500').first()).toBeVisible()

    // Star the group
    const starButton = page1.getByRole('button', { name: 'Add to favorites' })
    await expect(starButton).toBeVisible()
    await starButton.click()
    await expect(page1.getByRole('button', { name: 'Remove from favorites' })).toBeVisible()

    await context1.close()

    // Device 2: Sign in with same email
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()

    await signInWithMagicLink(page2, testEmail)

    // Check if group is starred on device 2
    await page2.goto('/groups')

    // The starred group should appear in starred section
    const starredSection = page2.getByRole('button', { name: 'Remove from favorites' })
    await expect(starredSection).toBeVisible()
    await expect(page2.getByText(groupName)).toBeVisible()

    await context2.close()
  })

  test('logout with clear option removes local data', async ({ page }) => {
    const testEmail = `test-${randomId(4)}@example.com`
    await signInWithMagicLink(page, testEmail)

    // Create a group
    await createGroupViaAPI(page, `Clear Test ${randomId(4)}`, ['Alice', 'Bob'])

    // Verify group appears in recents
    await page.goto('/groups')
    await expect(page.getByText('Clear Test')).toBeVisible()

    // Sign out with clear
    await signOut(page, true)

    // Verify groups are cleared
    await page.goto('/groups')
    await expect(page.getByText('You have not visited any')).toBeVisible()
  })

  test('logout without clear keeps local data', async ({ page }) => {
    const testEmail = `test-${randomId(4)}@example.com`
    await signInWithMagicLink(page, testEmail)

    // Create a group
    const groupName = `Keep Test ${randomId(4)}`
    await createGroupViaAPI(page, groupName, ['Alice', 'Bob'])

    await page.goto('/groups')
    await expect(page.getByText(groupName)).toBeVisible()

    // Sign out without clear
    await signOut(page, false)

    // Verify groups are still there
    await page.goto('/groups')
    await expect(page.getByText(groupName)).toBeVisible()
  })
})
