import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createServer } from 'vite'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const browserCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)
const executablePath = browserCandidates.find((candidate) => existsSync(candidate))

if (!executablePath) {
  throw new Error('Chrome/Edge not found. Set CHROME_PATH to run the browser smoke test.')
}

const port = 4181
const gameUrl = `http://127.0.0.1:${port}`
const server = await createServer({
  root: projectRoot,
  logLevel: 'silent',
  server: { host: '127.0.0.1', port, strictPort: true },
})

async function readScore(page) {
  const text = await page.locator('.hud-stat').first().locator('strong').textContent()
  return Number.parseInt(text ?? '0', 10)
}

async function assertRendered(page) {
  const canvas = page.locator('canvas')
  await canvas.waitFor({ state: 'visible' })
  const capture = await canvas.screenshot()
  if (capture.byteLength < 5_000) throw new Error('WebGL canvas appears to be empty')
}

let browser
try {
  await server.listen()
  browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--enable-webgl', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
  })

  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  })
  const desktopPage = await desktopContext.newPage()
  const desktopErrors = []
  desktopPage.on('pageerror', (error) => desktopErrors.push(error.message))

  await desktopPage.goto(gameUrl, { waitUntil: 'networkidle' })
  await desktopPage.getByText('Level 1', { exact: true }).waitFor({ state: 'visible' })
  const normalDifficulty = desktopPage.getByRole('button', { name: 'NORMAL' })
  await normalDifficulty.waitFor({ state: 'visible' })
  if ((await normalDifficulty.getAttribute('aria-pressed')) !== 'true') {
    throw new Error('NORMAL is not the default difficulty')
  }
  await desktopPage.getByRole('button', { name: 'TRANQUI' }).click()
  await desktopPage.getByRole('button', { name: 'Empezar partida' }).click()
  await desktopPage.getByLabel('5 vidas').waitFor({ state: 'visible' })
  await desktopPage.keyboard.press('ArrowLeft')
  await desktopPage.waitForTimeout(950)

  const desktopScore = await readScore(desktopPage)
  if (desktopScore < 10) {
    throw new Error(`desktop movement did not collect a pellet; score was ${desktopScore}`)
  }

  await desktopPage.keyboard.press('p')
  await desktopPage.getByRole('heading', { name: 'PAUSA' }).waitFor({ state: 'visible' })
  await desktopPage.keyboard.press('p')
  await desktopPage.getByRole('heading', { name: 'PAUSA' }).waitFor({ state: 'hidden' })

  await desktopPage.keyboard.press('p')
  await desktopPage.getByRole('button', { name: 'Volver al menú' }).click()
  await desktopPage.getByRole('heading', { name: 'ELEGÍ TU SUFRIMIENTO' }).waitFor({ state: 'visible' })
  await desktopPage.getByRole('button', { name: 'Empezar partida' }).click()

  await desktopPage.getByRole('button', { name: 'Silenciar sonido' }).click()
  await desktopPage.getByRole('button', { name: 'Activar sonido' }).waitFor({ state: 'visible' })

  await desktopPage.keyboard.press('r')
  await desktopPage.waitForTimeout(100)
  const resetScore = await readScore(desktopPage)
  if (resetScore !== 0) throw new Error(`restart did not reset score: ${resetScore}`)

  for (const level of [1, 2, 3]) {
    await desktopPage.keyboard.press(`Shift+${level}`)
    await desktopPage.getByText(`Level ${level}`, { exact: true }).waitFor({ state: 'visible' })
  }
  await desktopPage.keyboard.press('Shift+R')
  await desktopPage.keyboard.press('Shift+I')
  await desktopPage.getByText('DEV · INVULNERABLE', { exact: true }).waitFor({ state: 'visible' })
  await desktopPage.keyboard.press('Shift+D')
  await desktopPage.getByText('DEV INFO', { exact: true }).waitFor({ state: 'visible' })
  await assertRendered(desktopPage)
  if (desktopErrors.length > 0) {
    throw new Error(`desktop browser errors: ${desktopErrors.join(' | ')}`)
  }

  for (const [difficulty, lives] of [['NORMAL', 3], ['ARCADE', 3]]) {
    const difficultyPage = await desktopContext.newPage()
    const difficultyErrors = []
    difficultyPage.on('pageerror', (error) => difficultyErrors.push(error.message))
    await difficultyPage.goto(gameUrl, { waitUntil: 'networkidle' })
    await difficultyPage.getByRole('button', { name: difficulty }).click()
    await difficultyPage.getByRole('button', { name: 'Empezar partida' }).click()
    await difficultyPage.getByLabel(`${lives} vidas`).waitFor({ state: 'visible' })
    if (difficultyErrors.length > 0) {
      throw new Error(`${difficulty} browser errors: ${difficultyErrors.join(' | ')}`)
    }
    await difficultyPage.close()
  }
  await desktopContext.close()

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  const mobilePage = await mobileContext.newPage()
  const mobileErrors = []
  mobilePage.on('pageerror', (error) => mobileErrors.push(error.message))

  await mobilePage.goto(gameUrl, { waitUntil: 'networkidle' })
  await mobilePage.getByText('Deslizá para moverte').waitFor({ state: 'visible' })
  await mobilePage.getByRole('button', { name: 'Empezar partida' }).click()
  const surface = mobilePage.locator('.game-input-surface')
  await surface.dispatchEvent('pointerdown', {
    pointerId: 7,
    pointerType: 'touch',
    isPrimary: true,
    clientX: 260,
    clientY: 620,
  })
  await surface.dispatchEvent('pointermove', {
    pointerId: 7,
    pointerType: 'touch',
    isPrimary: true,
    clientX: 190,
    clientY: 620,
  })
  await surface.dispatchEvent('pointerup', {
    pointerId: 7,
    pointerType: 'touch',
    isPrimary: true,
    clientX: 190,
    clientY: 620,
  })
  await mobilePage.waitForTimeout(950)

  const mobileScore = await readScore(mobilePage)
  if (mobileScore < 10) {
    throw new Error(`mobile swipe did not collect a pellet; score was ${mobileScore}`)
  }
  const canvasBox = await mobilePage.locator('canvas').boundingBox()
  if (!canvasBox || canvasBox.width < 380 || canvasBox.height < 830) {
    throw new Error(`mobile canvas is not responsive: ${JSON.stringify(canvasBox)}`)
  }
  await assertRendered(mobilePage)
  if (mobileErrors.length > 0) {
    throw new Error(`mobile browser errors: ${mobileErrors.join(' | ')}`)
  }
  await mobileContext.close()

  console.log(
    `Browser smoke OK: desktop scored ${desktopScore}, mobile swipe scored ${mobileScore}, pause/restart/mute and responsive WebGL work.`,
  )
} finally {
  await browser?.close()
  await server.close()
}
