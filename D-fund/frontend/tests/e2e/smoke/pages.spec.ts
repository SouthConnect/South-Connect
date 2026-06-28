/**
 * Smoke tests — aucune authentification requise.
 * Ces tests tournent en CI sur chaque PR pour détecter les régressions critiques :
 * page blanche, erreur JS, CSP cassé, redirect infini.
 */
import { test, expect } from '@playwright/test'

const PUBLIC_PAGES = [
  { path: '/', name: 'Accueil' },
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
  { path: '/forgot-password', name: 'Mot de passe oublié' },
  { path: '/explore', name: 'Explorer' },
  { path: '/features', name: 'Features' },
]

test.describe('Smoke — pages publiques accessibles', () => {
  for (const { path, name } of PUBLIC_PAGES) {
    test(`${name} (${path}) charge sans erreur JS`, async ({ page }) => {
      const jsErrors: string[] = []
      page.on('pageerror', (err) => jsErrors.push(err.message))

      const response = await page.goto(path)

      // Pas de 4xx/5xx
      expect(response?.status()).toBeLessThan(400)

      // Pas de page blanche — au moins un élément visible
      await expect(page.locator('body')).not.toBeEmpty()

      // Aucune erreur JS bloquante
      const criticalErrors = jsErrors.filter(
        (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error promise'),
      )
      expect(criticalErrors).toHaveLength(0)
    })
  }
})

test.describe('Smoke — CSP non bloquant', () => {
  test('la page login charge sans erreur CSP eval()', async ({ page }) => {
    const cspErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Content-Security-Policy')) {
        cspErrors.push(msg.text())
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Aucune erreur CSP (le fix 'unsafe-eval' en dev doit être actif)
    const evalBlocks = cspErrors.filter((e) => e.includes('eval'))
    expect(evalBlocks).toHaveLength(0)
  })
})

test.describe('Smoke — redirections auth', () => {
  test('/dashboard redirige vers /login si non authentifié', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })

  test('/applications redirige vers /login si non authentifié', async ({ page }) => {
    await page.goto('/applications')
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })

  test('/profile redirige vers /login si non authentifié', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })
})

test.describe('Smoke — formulaire login', () => {
  test('le formulaire est interactif', async ({ page }) => {
    await page.goto('/login')
    const email = page.locator('[type="email"], [name="email"]').first()
    const password = page.locator('[type="password"]').first()
    const submit = page.locator('[type="submit"]').first()

    await expect(email).toBeVisible()
    await expect(password).toBeVisible()
    await expect(submit).toBeVisible()
    await expect(submit).not.toBeDisabled()
  })

  test('submit vide n\'envoie pas de requête (validation front)', async ({ page }) => {
    const apiCalls: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/auth/login')) apiCalls.push(req.url())
    })

    await page.goto('/login')
    await page.locator('[type="submit"]').first().click()
    await page.waitForTimeout(500)

    // Aucun appel API si champs vides
    expect(apiCalls).toHaveLength(0)
  })
})
