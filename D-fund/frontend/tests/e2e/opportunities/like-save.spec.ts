import { test, expect } from '@playwright/test'

// Helper: authenticate via API and set cookie
async function loginAs(page: any, email: string, password: string) {
  const res = await page.request.post('http://localhost:3001/api/v1/auth/login', {
    data: { email, password },
  })
  expect(res.ok()).toBeTruthy()
}

test.describe('Like / Save opportunités', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, process.env.TEST_EMAIL ?? 'test@example.com', process.env.TEST_PASSWORD ?? 'password123')
    await page.goto('/')
    // Attendre qu'une carte d'opportunité soit visible
    await page.waitForSelector('[title="J\'aime"]', { timeout: 10_000 })
  })

  test('like optimistic update visible immédiatement', async ({ page }) => {
    const likeBtn = page.locator('[title="J\'aime"]').first()
    const countBefore = await likeBtn.locator('span').textContent()
    await likeBtn.click()
    // L'update optimiste est immédiat — pas besoin d'attendre un réseau
    const countAfter = await likeBtn.locator('span').textContent()
    expect(Number(countAfter)).not.toEqual(Number(countBefore))
  })

  test('double-clic like ne crée pas deux likes', async ({ page }) => {
    const likeBtn = page.locator('[title="J\'aime"]').first()
    const countBefore = Number(await likeBtn.locator('span').textContent())
    await likeBtn.dblclick()
    await page.waitForTimeout(1500) // attendre onSettled
    const countAfter = Number(await likeBtn.locator('span').textContent())
    // Le double-clic doit avoir annulé (like puis unlike) → retour au départ ± 1
    expect(Math.abs(countAfter - countBefore)).toBeLessThanOrEqual(1)
  })

  test('like rollback si backend retourne une erreur', async ({ page, context }) => {
    const likeBtn = page.locator('[title="J\'aime"]').first()
    const countBefore = Number(await likeBtn.locator('span').textContent())

    // Bloquer les appels like/save
    await context.route('**/social/like/**', (route) => route.abort())

    await likeBtn.click()
    // Toast d'erreur doit apparaître
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5_000 })
    // Compteur revenu à la valeur initiale
    const countAfter = Number(await likeBtn.locator('span').textContent())
    expect(countAfter).toEqual(countBefore)
  })

  test('save rollback si backend retourne une erreur', async ({ page, context }) => {
    await context.route('**/social/save/**', (route) => route.abort())
    const saveBtn = page.locator('[title="Enregistrer"]').first()
    await saveBtn.click()
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5_000 })
  })

  test('bouton like disabled pendant la mutation', async ({ page }) => {
    const likeBtn = page.locator('[title="J\'aime"]').first()
    // Ralentir le réseau
    await page.route('**/social/like/**', async (route) => {
      await new Promise((r) => setTimeout(r, 1000))
      await route.continue()
    })
    await likeBtn.click()
    await expect(likeBtn).toBeDisabled()
  })
})
