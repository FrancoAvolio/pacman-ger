import { DIRECTION_VECTORS, OPPOSITE_DIRECTION } from './constants'
import { canMove, nextTile } from './movement'
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
  RED: { row: 0, col: 20 },
  PINK: { row: 0, col: 0 },
  CYAN: { row: 20, col: 20 },
  ORANGE: { row: 20, col: 0 },
}

export function scheduledGhostState(activeSeconds: number): GhostState {
  if (activeSeconds < 7) return 'SCATTER'
  if (activeSeconds < 27) return 'CHASE'
  if (activeSeconds < 34) return 'SCATTER'
  if (activeSeconds < 54) return 'CHASE'
  return 'CHASE'
}

function aheadOfPlayer(
  player: GridPosition,
  direction: Direction,
  distance: number,
): GridPosition {
  if (direction === 'NONE') return player
  const offset = DIRECTION_VECTORS[direction]
  return {
    row: player.row + offset.row * distance,
    col: player.col + offset.col * distance,
  }
}

export function getGhostTarget(
  personality: GhostPersonality,
  player: GridPosition,
  playerDirection: Direction,
  redGhost: GridPosition,
  ghost: GridPosition,
): GridPosition {
  if (personality === 'RED') return player
  if (personality === 'PINK') return aheadOfPlayer(player, playerDirection, 4)

  if (personality === 'CYAN') {
    const pivot = aheadOfPlayer(player, playerDirection, 2)
    return {
      row: pivot.row * 2 - redGhost.row,
      col: pivot.col * 2 - redGhost.col,
    }
  }

  const distance = Math.hypot(player.row - ghost.row, player.col - ghost.col)
  return distance > 6 ? player : SCATTER_TARGETS.ORANGE
}

export function chooseGhostDirection({
  tile,
  currentDirection,
  target,
  state,
  mayReverse,
}: {
  tile: GridPosition
  currentDirection: Direction
  target: GridPosition
  state: GhostState
  mayReverse: boolean
}): Exclude<Direction, 'NONE'> {
  let valid = MOVING_DIRECTIONS.filter((direction) => canMove(tile, direction))

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

  return valid.reduce((best, candidate) => {
    const bestTile = nextTile(tile, best)
    const candidateTile = nextTile(tile, candidate)
    const bestDistance = (bestTile.row - target.row) ** 2 + (bestTile.col - target.col) ** 2
    const candidateDistance =
      (candidateTile.row - target.row) ** 2 + (candidateTile.col - target.col) ** 2
    return candidateDistance < bestDistance ? candidate : best
  })
}
