import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/game/maze.ts', import.meta.url), 'utf8')
const rows = [...source.matchAll(/^\s*'([#.oPG ]+)',?$/gm)].map((match) => match[1])

function fail(message) {
  console.error(`Maze validation failed: ${message}`)
  process.exit(1)
}

if (rows.length === 0) fail('no map rows found')
if (new Set(rows.map((row) => row.length)).size !== 1) fail('rows have different widths')

const cells = rows.flatMap((row, rowIndex) =>
  [...row].map((cell, colIndex) => ({ cell, row: rowIndex, col: colIndex })),
)
const players = cells.filter(({ cell }) => cell === 'P')
const ghosts = cells.filter(({ cell }) => cell === 'G')
const pellets = cells.filter(({ cell }) => cell === '.' || cell === 'o')

if (players.length !== 1) fail(`expected 1 player spawn, found ${players.length}`)
if (ghosts.length !== 4) fail(`expected 4 ghost spawns, found ${ghosts.length}`)
if (pellets.length < 100) fail(`expected at least 100 pellets, found ${pellets.length}`)

const start = players[0]
const queue = [[start.row, start.col]]
const visited = new Set([`${start.row}:${start.col}`])

while (queue.length > 0) {
  const [row, col] = queue.shift()
  for (const [rowOffset, colOffset] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nextRow = row + rowOffset
    const nextCol = col + colOffset
    const key = `${nextRow}:${nextCol}`
    if (rows[nextRow]?.[nextCol] && rows[nextRow][nextCol] !== '#' && !visited.has(key)) {
      visited.add(key)
      queue.push([nextRow, nextCol])
    }
  }
}

const walkableCount = cells.filter(({ cell }) => cell !== '#').length
if (visited.size !== walkableCount) {
  fail(`${walkableCount - visited.size} walkable cells cannot be reached from the player`)
}

console.log(
  `Maze OK: ${rows[0].length}x${rows.length}, ${pellets.length} pellets, ${visited.size} reachable cells, 4 ghosts.`,
)
