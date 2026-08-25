import type { LevelConfig } from './levels'
import { cellAt, findCells, isWalkable, tileKey } from './maze'
import { getWalkableNeighbors } from './movement'
import type { GridPosition } from './types'

const EXPECTED_SIZE = 21
const ALLOWED_CELLS = new Set(['#', '.', 'o', 'P', 'G', ' '])

export type LevelValidationStats = {
  rows: number
  cols: number
  walkableCells: number
  reachableCells: number
  pellets: number
  powerPellets: number
  deadEnds: GridPosition[]
}

export type LevelValidationResult = {
  valid: boolean
  errors: string[]
  stats: LevelValidationStats
}

function samePosition(a: GridPosition, b: GridPosition): boolean {
  return a.row === b.row && a.col === b.col
}

function reachableFromPlayer(level: LevelConfig): Set<string> {
  const player = findCells('P', level)[0]
  if (!player) return new Set()

  const queue = [player]
  const visited = new Set([tileKey(player)])

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]
    for (const neighbor of getWalkableNeighbors(current, level)) {
      const key = tileKey(neighbor)
      if (visited.has(key)) continue
      visited.add(key)
      queue.push(neighbor)
    }
  }

  return visited
}

export function validateLevelConfig(level: LevelConfig): LevelValidationResult {
  const errors: string[] = []
  const rows = level.maze.length
  const cols = level.maze[0]?.length ?? 0

  if (rows !== EXPECTED_SIZE || cols !== EXPECTED_SIZE) {
    errors.push(`maze must be ${EXPECTED_SIZE}x${EXPECTED_SIZE}; got ${cols}x${rows}`)
  }
  level.maze.forEach((row, rowIndex) => {
    if (row.length !== cols) errors.push(`row ${rowIndex} has width ${row.length}; expected ${cols}`)
    Array.from(row).forEach((cell, colIndex) => {
      if (!ALLOWED_CELLS.has(cell)) {
        errors.push(`invalid cell ${JSON.stringify(cell)} at ${rowIndex}:${colIndex}`)
      }
    })
  })

  const players = findCells('P', level)
  const ghosts = findCells('G', level)
  const pellets = [...findCells('.', level), ...findCells('o', level)]
  const powerPellets = findCells('o', level)

  if (players.length !== 1) errors.push(`expected 1 player spawn; found ${players.length}`)
  if (ghosts.length !== 4) errors.push(`expected 4 ghost spawns; found ${ghosts.length}`)
  if (pellets.length === 0) errors.push('maze must contain pellets')
  if (powerPellets.length === 0) errors.push('maze must contain power pellets')

  if (level.ghostSpeedMultiplier < 1) errors.push('ghost speed multiplier must be at least 1')
  if (level.pacmanSpeedMultiplier < 1) errors.push('Pac-Man speed multiplier must be at least 1')
  if (level.frightenedDurationMs <= 0) errors.push('frightened duration must be positive')
  if (level.bonus.pelletThreshold < 0.55 || level.bonus.pelletThreshold > 0.65) {
    errors.push('bonus pellet threshold must be between 0.55 and 0.65')
  }
  if (level.bonus.visibleDurationMs <= 0) errors.push('bonus duration must be positive')
  if (level.bonus.points !== 1_000) errors.push('bonus must be worth 1000 points')

  const releaseDelays = Object.values(level.ghostReleaseDelaysMs)
  if (releaseDelays.some((delay) => delay < 0)) errors.push('ghost release delays cannot be negative')

  const bonusCell = cellAt(level.bonus.spawnTile, level)
  if (!isWalkable(level.bonus.spawnTile, level)) {
    errors.push('bonus spawn must be on a walkable tile')
  } else if (bonusCell === 'G') {
    errors.push('bonus spawn cannot overlap a ghost spawn')
  }

  const seenTunnelEndpoints = new Set<string>()
  for (const tunnel of level.tunnels) {
    const leftKey = tileKey(tunnel.left)
    const rightKey = tileKey(tunnel.right)
    if (tunnel.axis !== 'horizontal') errors.push('only horizontal tunnels are supported')
    if (tunnel.left.row !== tunnel.right.row) errors.push('tunnel endpoints must share a row')
    if (tunnel.left.col !== 0 || tunnel.right.col !== cols - 1) {
      errors.push('horizontal tunnel endpoints must be on opposite maze edges')
    }
    if (!isWalkable(tunnel.left, level) || !isWalkable(tunnel.right, level)) {
      errors.push('tunnel endpoints must both be walkable')
    }
    if (samePosition(tunnel.left, tunnel.right)) errors.push('tunnel endpoints must be distinct')
    if (seenTunnelEndpoints.has(leftKey) || seenTunnelEndpoints.has(rightKey)) {
      errors.push('tunnel endpoints must be unique')
    }
    seenTunnelEndpoints.add(leftKey)
    seenTunnelEndpoints.add(rightKey)
  }

  const walkable: GridPosition[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < level.maze[row].length; col += 1) {
      const position = { row, col }
      if (isWalkable(position, level)) walkable.push(position)
    }
  }

  const reachable = reachableFromPlayer(level)
  if (players.length === 1 && reachable.size !== walkable.length) {
    errors.push(`${walkable.length - reachable.size} walkable cells are unreachable`)
  }
  if (reachable.size > 0 && !reachable.has(tileKey(level.bonus.spawnTile))) {
    errors.push('bonus spawn is unreachable')
  }

  const deadEnds = walkable.filter(
    (position) => getWalkableNeighbors(position, level).length <= 1,
  )

  return {
    valid: errors.length === 0,
    errors,
    stats: {
      rows,
      cols,
      walkableCells: walkable.length,
      reachableCells: reachable.size,
      pellets: pellets.length,
      powerPellets: powerPellets.length,
      deadEnds,
    },
  }
}

export function assertValidLevelConfig(level: LevelConfig): void {
  const validation = validateLevelConfig(level)
  if (!validation.valid) {
    throw new Error(`Invalid level ${level.id}: ${validation.errors.join('; ')}`)
  }
}

export function validateCampaign(levels: readonly LevelConfig[]): string[] {
  const errors = levels.flatMap((level) =>
    validateLevelConfig(level).errors.map((error) => `Level ${level.id}: ${error}`),
  )
  const ids = levels.map(({ id }) => id)
  if (new Set(ids).size !== ids.length) errors.push('level ids must be unique')
  if (levels.length !== 3) errors.push(`campaign must contain 3 levels; found ${levels.length}`)
  return errors
}
