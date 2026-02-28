import { test, expect } from '@playwright/test'

test.describe('pitchdrop smoke tests', () => {
  test('feed page loads with nav and connect prompt', async ({ page }) => {
    await page.goto('/feed')
    await expect(page.getByText('pitchdrop')).toBeVisible()
    await expect(page.getByRole('button')).toBeVisible()
  })

  test('leaderboard page loads', async ({ page }) => {
    await page.goto('/leaderboard')
    await expect(page.getByText(/leaderboard/i)).toBeVisible()
  })

  test('airdrop page shows connect wallet prompt when unauthenticated', async ({ page }) => {
    await page.goto('/airdrop')
    await expect(page.getByText(/connect your wallet/i)).toBeVisible()
  })

  test('idea detail renders without crash for unknown id', async ({ page }) => {
    const response = await page.goto('/ideas/nonexistent-id-000')
    expect([200, 404]).toContain(response?.status() ?? 200)
  })

  test('milestone page shows auth prompt when unauthenticated', async ({ page }) => {
    await page.goto('/ideas/test-id/milestones')
    await expect(page.getByText(/sign in/i)).toBeVisible()
  })
})
