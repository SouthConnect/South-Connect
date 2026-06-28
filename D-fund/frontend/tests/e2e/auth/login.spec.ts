import { test, expect } from '@playwright/test'

test.describe('Login', () => {
  test('login valide redirige vers accueil', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', process.env.TEST_EMAIL ?? 'test@example.com')
    await page.fill('[name="password"]', process.env.TEST_PASSWORD ?? 'password123')
    await page.click('[type="submit"]')
    await expect(page).toHaveURL('/', { timeout: 10_000 })
  })

  test('mauvais mot de passe affiche un toast erreur', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'mauvais_mdp_xyz')
    await page.click('[type="submit"]')
    // Bouton re-enabled après échec (pas de loading infini)
    await expect(page.locator('[type="submit"]')).not.toBeDisabled({ timeout: 8_000 })
    // Toast d'erreur visible
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5_000 })
  })

  test('bouton submit est disabled pendant le chargement', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    const submitBtn = page.locator('[type="submit"]')
    await submitBtn.click()
    // Doit être disabled immédiatement après clic
    await expect(submitBtn).toBeDisabled()
  })

  test('double clic ne déclenche pas deux requêtes', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/auth/login')) requests.push(req.url())
    })
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.locator('[type="submit"]').dblclick()
    await page.waitForTimeout(1000)
    expect(requests.length).toBeLessThanOrEqual(1)
  })
})
