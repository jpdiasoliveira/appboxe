import { randomUUID } from 'crypto'
import { test, expect, type Page } from '@playwright/test'
import { cleanupE2eStudentByEmail } from './helpers/cleanup'
import { loadE2eEnv } from './helpers/env'

const OWNER_EMAIL = 'owner@academia-teste.dev'
const PASSWORD = 'RingPro@dev123'

async function loginStudent(page: Page, email: string) {
  if (!page.url().includes('/login')) {
    await page.goto('/login')
  }

  await page.locator('#email').fill(email)
  await page.locator('#password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()

  const alert = page.getByRole('alert')
  const result = await Promise.race([
    page.waitForURL(/\/student\//, { timeout: 45_000 }).then(() => 'ok' as const),
    alert.waitFor({ state: 'visible', timeout: 45_000 }).then(async () => ({
      kind: 'error' as const,
      text: await alert.textContent(),
    })),
  ])

  if (result !== 'ok') {
    throw new Error(`Login falhou: ${result.text ?? 'erro desconhecido'}`)
  }
}

async function completeInviteAndReachOnboarding(page: Page, email: string) {
  const inviteResponse = page.waitForResponse(
    (res) => res.url().includes('complete-student-invite') && res.request().method() === 'POST',
    { timeout: 90_000 },
  )

  await page.getByRole('button', { name: 'Concluir matrícula' }).click()

  const response = await inviteResponse
  const body = (await response.json().catch(() => ({}))) as { studentId?: string; error?: string }
  if (!response.ok() || body.error) {
    throw new Error(`complete-student-invite falhou (${response.status()}): ${JSON.stringify(body)}`)
  }
  expect(body.studentId).toBeTruthy()

  await page.waitForFunction(
    () => {
      const path = window.location.pathname
      return path.startsWith('/student/') || path === '/login'
    },
    undefined,
    { timeout: 60_000 },
  )

  if (page.url().includes('/login')) {
    await loginStudent(page, email)
  }

  await expect
    .poll(async () => {
      if (!page.url().includes('/student/onboarding')) {
        await page.goto('/student/onboarding')
      }
      return page.getByRole('heading', { name: 'Configure sua conta' }).isVisible()
    })
    .toBe(true)
}

test.describe('UP-502 — matrícula E2E', () => {
  let studentEmail = ''

  test.beforeAll(() => {
    const env = loadE2eEnv()
    test.skip(!env.url || !env.anonKey, 'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY necessários no .env da raiz')
  })

  test.beforeEach(() => {
    studentEmail = `e2e-enroll-${Date.now()}-${randomUUID().slice(0, 6)}@academia-teste.dev`
  })

  test.afterEach(async () => {
    const env = loadE2eEnv()
    if (env.serviceKey && studentEmail) {
      await cleanupE2eStudentByEmail(env, studentEmail)
    }
  })

  test('owner gera convite → aluno completa onboarding → pagamento mock → Ativo', async ({ browser }) => {
    const ownerContext = await browser.newContext()
    const ownerPage = await ownerContext.newPage()

    await ownerPage.goto('/login')
    await ownerPage.locator('#email').fill(OWNER_EMAIL)
    await ownerPage.locator('#password').fill(PASSWORD)
    await ownerPage.getByRole('button', { name: 'Entrar' }).click()
    await ownerPage.waitForURL(/\/academy/, { timeout: 60_000 })

    await ownerPage.goto('/academy/alunos/novo')
    await ownerPage.getByRole('button', { name: 'Link de matrícula' }).click()
    await ownerPage.getByRole('button', { name: 'Gerar link' }).click()

    const linkLocator = ownerPage.locator('p.break-all').filter({ hasText: '/convite/' })
    await expect(linkLocator).toBeVisible({ timeout: 60_000 })
    const inviteUrl = (await linkLocator.textContent())?.trim()
    expect(inviteUrl).toMatch(/\/convite\/[a-zA-Z0-9-]+/)

    await ownerContext.close()

    const studentContext = await browser.newContext()
    const page = await studentContext.newPage()

    await page.goto(inviteUrl!)
    await expect(page.getByRole('heading', { name: 'Complete sua matrícula' })).toBeVisible()

    await page.locator('#email').fill(studentEmail)
    await page.locator('#name').fill('E2E Smoke Aluno')
    await page.getByLabel(/^Senha/).first().fill(PASSWORD)
    await page.getByLabel(/^Confirmar senha/).fill(PASSWORD)

    const termCheckbox = page.getByRole('checkbox', { name: /Li e aceito/ })
    if (await termCheckbox.isVisible()) {
      await termCheckbox.check()
    }

    await completeInviteAndReachOnboarding(page, studentEmail)

    await page.getByRole('button', { name: 'Continuar' }).click()

    await expect(page.getByText('Escolha o plano de mensalidade')).toBeVisible()
    const planCard = page.locator('button.rounded-xl.border.p-4').first()
    await expect(planCard).toBeVisible({ timeout: 30_000 })
    await planCard.click()
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeEnabled({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Continuar' }).click()

    await expect(page.getByText(/Escolha até \d+ modalidade/)).toBeVisible()
    await page.locator('input[type="checkbox"]').first().check()
    await page.getByRole('button', { name: 'Continuar' }).click()

    await expect(page.getByText('Primeira mensalidade', { exact: true })).toBeVisible({
      timeout: 60_000,
    })
    await page.getByRole('button', { name: 'Simular pagamento (dev)' }).click()
    await expect(page.getByText('Pagamento confirmado!')).toBeVisible({ timeout: 60_000 })

    await page.getByRole('button', { name: 'Ir para o painel' }).click()
    await page.waitForURL(/\/student\/dashboard/, { timeout: 60_000 })

    await expect(page.getByText('Meu painel')).toBeVisible()
    await expect(page.getByText('Ativo', { exact: true })).toBeVisible()

    await studentContext.close()
  })
})
