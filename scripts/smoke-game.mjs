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
const server = await createServer({
  root: projectRoot,
  logLevel: 'silent',
  server: { host: '127.0.0.1', port, strictPort: true },
})

let browser
try {
  await server.listen()
  browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--enable-webgl', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
  })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Empezar partida' }).click()
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(950)

  const scoreText = await page.locator('.hud-stat').first().locator('strong').textContent()
  const score = Number.parseInt(scoreText ?? '0', 10)
  if (score < 10) throw new Error(`player did not collect a pellet; score was ${score}`)

  await page.keyboard.press('p')
  await page.getByRole('heading', { name: 'PAUSA' }).waitFor({ state: 'visible' })
  await page.keyboard.press('p')
  await page.getByRole('heading', { name: 'PAUSA' }).waitFor({ state: 'hidden' })

  await page.keyboard.press('r')
  await page.waitForTimeout(100)
  const resetScore = await page.locator('.hud-stat').first().locator('strong').textContent()
  if (resetScore !== '000000') throw new Error(`restart did not reset score: ${resetScore}`)

  const canvasCapture = await page.locator('canvas').screenshot()
  if (canvasCapture.byteLength < 5_000) throw new Error('WebGL canvas appears to be empty')
  if (pageErrors.length > 0) throw new Error(`browser errors: ${pageErrors.join(' | ')}`)

  console.log(`Browser smoke OK: movement scored ${score}, pause/resume and restart work, WebGL rendered.`)
} finally {
  await browser?.close()
  await server.close()
}
