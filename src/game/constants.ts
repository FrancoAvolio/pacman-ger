import type { Direction, GridPosition } from './types'

export const TILE_SIZE = 1
export const WALL_HEIGHT = 0.64
export const PLAYER_SPEED = 5.1
export const GHOST_SPEED = 3.85
export const FRIGHTENED_GHOST_SPEED = 2.8
export const EATEN_GHOST_SPEED = 6.4
export const FRIGHTENED_DURATION_MS = 7_000
export const RESPAWN_GRACE_MS = 1_500

export const DIRECTION_VECTORS: Record<Exclude<Direction, 'NONE'>, GridPosition> = {
  UP: { row: -1, col: 0 },
  DOWN: { row: 1, col: 0 },
  LEFT: { row: 0, col: -1 },
  RIGHT: { row: 0, col: 1 },
}

export const KEY_DIRECTIONS: Record<string, Exclude<Direction, 'NONE'>> = {
  ArrowUp: 'UP',
  KeyW: 'UP',
  ArrowDown: 'DOWN',
  KeyS: 'DOWN',
  ArrowLeft: 'LEFT',
  KeyA: 'LEFT',
  ArrowRight: 'RIGHT',
  KeyD: 'RIGHT',
}

export const OPPOSITE_DIRECTION: Record<Exclude<Direction, 'NONE'>, Exclude<Direction, 'NONE'>> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
}
