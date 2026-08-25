import { OPPOSITE_DIRECTION } from './constants'
import { DEFAULT_LEVEL } from './levels'
import type { LevelConfig } from './levels'
import { isWalkable, tileKey } from './maze'
import { canMove, getWalkableNeighbors, nextTile } from './movement'
import type {
  Direction,
  GhostPersonality,
  GhostState,
  GridPosition,
} from './types'

const MOVING_DIRECTIONS: Exclude<Direction, 'NONE'>[] = [
  'UP',
  'LEFT',
  'DOWN',
  'RIGHT',
]

export const SCATTER_TARGETS: Record<GhostPersonality, GridPosition> = {
  RED: { row: 1, col: 19 },
  PINK: { row: 1, col: 1 },
  CYAN: { row: 19, col: 19 },
  ORANGE: { row: 19, col: 1 },
}

export const FRIGHTENED_WARNING_MS = 2_000

export type FrightenedVisualState = 'NORMAL' | 'BLUE' | 'WHITE'

export function scheduledGhostState(activeSeconds: number): GhostState {
  if (activeSeconds < 7) return 'SCATTER'
  if (activeSeconds < 27) return 'CHASE'
  if (activeSeconds < 34) return 'SCATTER'
  if (activeSeconds < 54) return 'CHASE'
  return 'CHASE'
}

export function isGhostReleased(
  personality: GhostPersonality,
  activeMs: number,
  level: LevelConfig = DEFAULT_LEVEL,
): boolean {
  return activeMs >= level.ghostReleaseDelaysMs[personality]
}

export function shouldGhostMove(
  personality: GhostPersonality,
  activeMs: number,
  state: GhostState,
  level: LevelConfig = DEFAULT_LEVEL,
): boolean {
  return state === 'EATEN' || isGhostReleased(personality, activeMs, level)
}

export function getFrightenedVisualState(remainingMs: number): FrightenedVisualState {
  if (remainingMs <= 0) return 'NORMAL'
  if (remainingMs > FRIGHTENED_WARNING_MS) return 'BLUE'

  const warningElapsed = FRIGHTENED_WARNING_MS - remainingMs
  const flashInterval = remainingMs <= 1_000 ? 125 : 250
  return Math.floor(warningElapsed / flashInterval) % 2 === 0 ? 'BLUE' : 'WHITE'
}

function aheadOfPlayer(
  player: GridPosition,
  direction: Direction,
  distance: number,
  level: LevelConfig,
): GridPosition {
  if (direction === 'NONE') return player

  let target = player
  for (let step = 0; step < distance; step += 1) {
    target = nextTile(target, direction, level)
  }
  return target
}

function buildDistanceMap(
  target: GridPosition,
  level: LevelConfig,
): Map<string, number> {
  if (!isWalkable(target, level)) return new Map()

  const queue = [target]
  const distances = new Map([[tileKey(target), 0]])
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]
    const distance = distances.get(tileKey(current)) ?? 0
    for (const neighbor of getWalkableNeighbors(current, level)) {
      const key = tileKey(neighbor)
      if (distances.has(key)) continue
      distances.set(key, distance + 1)
      queue.push(neighbor)
    }
  }
  return distances
}

export function shortestPathDistance(
  from: GridPosition,
  to: GridPosition,
  level: LevelConfig = DEFAULT_LEVEL,
): number {
  if (!isWalkable(from, level)) return Number.POSITIVE_INFINITY
  return buildDistanceMap(to, level).get(tileKey(from)) ?? Number.POSITIVE_INFINITY
}

export function getGhostTarget(
  personality: GhostPersonality,
  player: GridPosition,
  playerDirection: Direction,
  redGhost: GridPosition,
  ghost: GridPosition,
  level: LevelConfig = DEFAULT_LEVEL,
): GridPosition {
  if (personality === 'RED') return player
  if (personality === 'PINK') return aheadOfPlayer(player, playerDirection, 4, level)

  if (personality === 'CYAN') {
    const pivot = aheadOfPlayer(player, playerDirection, 2, level)
    return {
      row: pivot.row * 2 - redGhost.row,
      col: pivot.col * 2 - redGhost.col,
    }
  }

  const pathDistance = shortestPathDistance(player, ghost, level)
  const distance = Number.isFinite(pathDistance)
    ? pathDistance
    : Math.hypot(player.row - ghost.row, player.col - ghost.col)
  return distance > 6 ? player : SCATTER_TARGETS.ORANGE
}

export function chooseGhostDirection({
  tile,
  currentDirection,
  target,
  state,
  mayReverse,
  level = DEFAULT_LEVEL,
}: {
  tile: GridPosition
  currentDirection: Direction
  target: GridPosition
  state: GhostState
  mayReverse: boolean
  level?: LevelConfig
}): Exclude<Direction, 'NONE'> {
  let valid = MOVING_DIRECTIONS.filter((direction) => canMove(tile, direction, level))

  if (!mayReverse && currentDirection !== 'NONE' && valid.length > 1) {
    const reverse = OPPOSITE_DIRECTION[currentDirection]
    valid = valid.filter((direction) => direction !== reverse)
  }

  if (valid.length === 0) {
    return currentDirection === 'NONE' ? 'LEFT' : OPPOSITE_DIRECTION[currentDirection]
  }

  if (state === 'FRIGHTENED') {
    return valid[Math.floor(Math.random() * valid.length)]
  }

  const distances = buildDistanceMap(target, level)
  const distanceToTarget = (position: GridPosition): number => {
    const pathDistance = distances.get(tileKey(position))
    if (pathDistance !== undefined) return pathDistance

    // Chase targets can intentionally land beyond a wall; retain the classic
    // geometric fallback while using graph distance for real tiles.
    return (position.row - target.row) ** 2 + (position.col - target.col) ** 2
  }

  return valid.reduce((best, candidate) => {
    const bestTile = nextTile(tile, best, level)
    const candidateTile = nextTile(tile, candidate, level)
    return distanceToTarget(candidateTile) < distanceToTarget(bestTile)
      ? candidate
      : best
  })
}
