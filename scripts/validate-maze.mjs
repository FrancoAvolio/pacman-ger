import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const vitestEntry = fileURLToPath(
  new URL('../node_modules/vitest/vitest.mjs', import.meta.url),
)

// Keep validation on the same typed level data and navigation graph used by
// the game. The focused suite checks dimensions, spawns, reachability, dead
// ends, bonus tiles, difficulty config, and tunnel topology for all 3 maps.
const result = spawnSync(
  process.execPath,
  [vitestEntry, 'run', 'src/game/levels.test.ts'],
  { cwd: projectRoot, stdio: 'inherit' },
)

if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)

console.log('Campaign maze validation OK: 3 levels and tunnel graph verified.')
