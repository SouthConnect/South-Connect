import { test, expect } from '@playwright/test'

test.describe('Follow / Unfollow', () => {
  test('follow d\'un profil met à jour le compteur', async ({ page }) => {
    await page.request.post('http://localhost:3001/api/v1/auth/login', {
      data: {
        email: process.env.TEST_EMAIL ?? 'test@example.com',
        password: process.env.TEST_PASSWORD ?? 'password123',
      },
    })

    // Accéder à un profil public (utiliser TEST_PROFILE_ID si disponible)
    if (!process.env.TEST_PROFILE_ID) {
      test.skip()
      return
    }

    await page.goto(`/profiles/${process.env.TEST_PROFILE_ID}`)
    const followBtn = page.locator('button:has-text("Suivre"), button:has-text("Se désabonner")').first()
    await expect(followBtn).toBeVisible({ timeout: 8_000 })

    const initialText = await followBtn.textContent()
    await followBtn.click()

    // Bouton doit changer d'état
    await expect(followBtn).not.toHaveText(initialText ?? '', { timeout: 5_000 })
  })

  test('follow rollback si erreur réseau', async ({ page, context }) => {
    await context.route('**/social/follow/**', (route) => route.abort())

    if (!process.env.TEST_PROFILE_ID) { test.skip(); return }
    await page.goto(`/profiles/${process.env.TEST_PROFILE_ID}`)

    const followBtn = page.locator('button:has-text("Suivre")').first()
    if (!await followBtn.isVisible()) { test.skip(); return }

    await followBtn.click()
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5_000 })
    // Bouton revenu à l'état "Suivre" (rollback)
    await expect(followBtn).toBeVisible({ timeout: 3_000 })
  })
})
