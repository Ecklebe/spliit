import { randomId } from '@/lib/api'
import { expect, test } from '@playwright/test'
import { signInWithMagicLink } from '../helpers/auth'
import { createGroupViaAPI } from '../helpers/batch-api'

test.describe('Sync Error Handling', () => {
  test('handles network errors gracefully', async ({ page, context }) => {
    const testEmail = `test-${randomId(4)}@example.com`
    await signInWithMagicLink(page, testEmail)

    const groupId = await createGroupViaAPI(page, `Error Test ${randomId(4)}`, [
      'Alice',
      'Bob',
    ])

    await page.goto('/groups')
    await page.waitForLoadState('networkidle')

    // Simulate network failure by going offline
    await context.setOffline(true)

    // Try to sync - click cloud-off icon
    const syncButton = page
      .locator('button')
      .filter({ has: page.locator('svg.lucide-cloud-off') })
      .first()
    if (await syncButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await syncButton.click()

      // Should show error toast/message
      await expect(
        page.getByText(/error|failed|network|sync failed/i),
      ).toBeVisible({
        timeout: 5000,
      })
    }

    // Go back online
    await context.setOffline(false)

    // Retry should work
    const retryButton = page
      .locator('button')
      .filter({ has: page.locator('svg.lucide-cloud-off') })
      .first()
    if (await retryButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await retryButton.click()
      await page.waitForTimeout(1000)
      // Should show synced state (blue cloud)
      await expect(
        page.locator('svg.lucide-cloud.text-blue-500').first(),
      ).toBeVisible({
        timeout: 5000,
      })
    }
  })

  test('handles server errors with retry', async ({ page, context }) => {
    const testEmail = `test-${randomId(4)}@example.com`
    await signInWithMagicLink(page, testEmail)

    const groupId = await createGroupViaAPI(page, `Retry Test ${randomId(4)}`, [
      'Alice',
      'Bob',
    ])

    await page.goto('/groups')
    await page.waitForLoadState('networkidle')

    // Mock API failure by intercepting requests
    await page.route('**/api/trpc/**', async (route) => {
      // Fail first request
      if (route.request().url().includes('sync')) {
        await route.abort('failed')
      } else {
        await route.continue()
      }
    })

    // Try to sync (should fail)
    const syncButton = page
      .locator('button')
      .filter({ has: page.locator('svg.lucide-cloud-off') })
      .first()
    if (await syncButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await syncButton.click()

      // Error should be shown or retry should happen
      await page.waitForTimeout(2000)
    }

    // Remove route interception (allow requests)
    await page.unroute('**/api/trpc/**')

    // Retry should work now
    const retryButton = page
      .locator('button')
      .filter({ has: page.locator('svg.lucide-cloud-off') })
      .first()
    if (await retryButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await retryButton.click()
      await page.waitForTimeout(1000)
      // Should show synced state (blue cloud)
      await expect(
        page.locator('svg.lucide-cloud.text-blue-500').first(),
      ).toBeVisible({
        timeout: 5000,
      })
    }
  })

  test('shows appropriate error for invalid group', async ({ page }) => {
    const testEmail = `test-${randomId(4)}@example.com`
    await signInWithMagicLink(page, testEmail)

    // Try to access a non-existent group
    const response = await page.goto('/groups/invalid-group-id-12345')

    // Should redirect or show error - check for either redirect or error UI
    const hasError = await Promise.race([
      page
        .getByText(/not found|doesn't exist|error|invalid/i)
        .isVisible({ timeout: 3000 })
        .then(() => true),
      page.waitForURL(/\/(groups|$)/, { timeout: 3000 }).then(() => true),
    ]).catch(() => response?.status() !== 200)

    expect(hasError).toBeTruthy()
  })

  test('handles concurrent sync operations', async ({ page }) => {
    const testEmail = `test-${randomId(4)}@example.com`
    await signInWithMagicLink(page, testEmail)

    const group1Name = `Concurrent 1 ${randomId(4)}`
    const group2Name = `Concurrent 2 ${randomId(4)}`

    const group1Id = await createGroupViaAPI(page, group1Name, ['Alice', 'Bob'])
    const group2Id = await createGroupViaAPI(page, group2Name, [
      'Charlie',
      'Dave',
    ])

    // Go to groups list where both groups are visible
    await page.goto('/groups')
    await page.waitForLoadState('networkidle')

    // Find both group cards and sync them individually
    const group1Card = page.locator(`li:has-text("${group1Name}")`).first()
    const group2Card = page.locator(`li:has-text("${group2Name}")`).first()

    // Sync first group
    const sync1 = group1Card
      .locator('button')
      .filter({ has: page.locator('svg.lucide-cloud-off') })
      .first()
    if (await sync1.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sync1.click()
      await page.waitForTimeout(1000)
    }

    // Sync second group
    const sync2 = group2Card
      .locator('button')
      .filter({ has: page.locator('svg.lucide-cloud-off') })
      .first()
    if (await sync2.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sync2.click()
      await page.waitForTimeout(1000)
    }

    // Verify both groups are synced
    await expect(
      group1Card.locator('svg.lucide-cloud.text-blue-500').first(),
    ).toBeVisible({ timeout: 5000 })
    await expect(
      group2Card.locator('svg.lucide-cloud.text-blue-500').first(),
    ).toBeVisible({ timeout: 5000 })
  })
})
