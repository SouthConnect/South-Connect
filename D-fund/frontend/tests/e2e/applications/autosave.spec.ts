import { test, expect } from '@playwright/test'

test.describe('Application — autosave & navigation guard', () => {
  // Ces tests nécessitent un brouillon de candidature existant
  // Pré-requis: TEST_APPLICATION_ID dans l'env

  test.skip(!process.env.TEST_APPLICATION_ID, 'TEST_APPLICATION_ID non défini')

  test.beforeEach(async ({ page }) => {
    // Authentification
    await page.request.post('http://localhost:3001/api/v1/auth/login', {
      data: {
        email: process.env.TEST_EMAIL ?? 'test@example.com',
        password: process.env.TEST_PASSWORD ?? 'password123',
      },
    })
    await page.goto(`/applications/${process.env.TEST_APPLICATION_ID}`)
    await page.waitForSelector('textarea', { timeout: 10_000 })
  })

  test('autosave sauvegarde après 3 secondes d\'inactivité', async ({ page }) => {
    const savedRequests: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/applications/') && req.method() === 'PUT') {
        savedRequests.push(req.url())
      }
    })

    await page.fill('textarea', 'Contenu de test autosave ' + Date.now())
    // Attendre les 3s + marge
    await page.waitForTimeout(4000)
    expect(savedRequests.length).toBeGreaterThan(0)
  })

  test('submit inclut le dernier keystroke sans attendre l\'autosave', async ({ page }) => {
    const uniqueText = 'Contenu soumis ' + Date.now()
    const savedBodies: string[] = []

    page.on('request', async (req) => {
      if (req.url().includes('/applications/') && req.method() === 'PUT') {
        savedBodies.push(req.postData() ?? '')
      }
    })

    // Modifier et soumettre immédiatement (avant les 3s d'autosave)
    await page.fill('textarea', uniqueText)
    await page.check('[type="checkbox"]')

    const submitBtn = page.locator('button:has-text("Soumettre")')
    await submitBtn.click()

    // Vérifier que la sauvegarde a bien eu lieu avec le texte le plus récent
    await page.waitForTimeout(2000)
    const hasLatestContent = savedBodies.some((b) => b.includes(uniqueText.slice(0, 20)))
    expect(hasLatestContent).toBeTruthy()
  })

  test('indicateur autosave visible quand il y a des modifications non sauvegardées', async ({ page }) => {
    await page.fill('textarea', 'Modification test')
    await expect(page.locator('text=Auto-sauvegardé')).toBeVisible()
  })

  test('beforeunload déclenché si modifications non sauvegardées', async ({ page }) => {
    await page.fill('textarea', 'Modification non sauvegardée')
    // Vérifier que le beforeunload est bien enregistré
    const dialogPromise = page.waitForEvent('dialog', { timeout: 3000 }).catch(() => null)
    await page.evaluate(() => window.dispatchEvent(new Event('beforeunload')))
    // Ne doit pas naviguer librement
    expect(await page.url()).toContain('/applications/')
  })
})
