import { DIRECTION_VECTORS } from './constants'
import { DEFAULT_LEVEL, getTunnelDestination } from './levels'
import type { LevelConfig } from './levels'
import { gridToActorWorld, isWalkable } from './maze'
import type { Direction, GridPosition } from './types'

const MOVING_DIRECTIONS: readonly Exclude<Direction, 'NONE'>[] = [
  'UP',
  'LEFT',
  'DOWN',
  'RIGHT',
]

export type ResolvedMove = {
  from: GridPosition
  to: GridPosition
  // For a tunnel this is one tile beyond the board, never the far endpoint.
  visualTo: GridPosition
  direction: Direction
  wrapped: boolean
}

export type MoveInterpolation = {
  position: [number, number, number]
  // Rendering the counterpart while crossing makes both exits continuous.
  wrappedPosition: [number, number, number] | null
}

export function resolveMove(
  position: GridPosition,
  direction: Direction,
  level: LevelConfig = DEFAULT_LEVEL,
): ResolvedMove {
  if (direction === 'NONE') {
    return {
      from: position,
      to: position,
      visualTo: position,
      direction,
      wrapped: false,
    }
  }

  const offset = DIRECTION_VECTORS[direction]
  const adjacent = {
    row: position.row + offset.row,
    col: position.col + offset.col,
  }
  const tunnelDestination = getTunnelDestination(level, position, direction)

  return {
    from: position,
    to: tunnelDestination ?? adjacent,
    visualTo: adjacent,
    direction,
    wrapped: tunnelDestination !== null,
  }
}

export function nextTile(
  position: GridPosition,
  direction: Direction,
  level: LevelConfig = DEFAULT_LEVEL,
): GridPosition {
  return resolveMove(position, direction, level).to
}

export function canMove(
  position: GridPosition,
  direction: Direction,
  level: LevelConfig = DEFAULT_LEVEL,
): boolean {
  return (
    direction !== 'NONE' &&
    isWalkable(resolveMove(position, direction, level).to, level)
  )
}

export function getWalkableNeighbors(
  position: GridPosition,
  level: LevelConfig = DEFAULT_LEVEL,
): GridPosition[] {
  return MOVING_DIRECTIONS.flatMap((direction) =>
    canMove(position, direction, level)
      ? [nextTile(position, direction, level)]
      : [],
  )
}

export function interpolateMove(
  move: ResolvedMove,
  progress: number,
  level: LevelConfig = DEFAULT_LEVEL,
): MoveInterpolation {
  const amount = Math.max(0, Math.min(1, progress))
  const from = gridToActorWorld(move.from, level)
  const to = gridToActorWorld(move.visualTo, level)
  const position: [number, number, number] = [
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
    from[2] + (to[2] - from[2]) * amount,
  ]

  if (!move.wrapped) return { position, wrappedPosition: null }

  const boardWidth = level.maze[0].length
  const wrapOffset = move.visualTo.col < 0 ? boardWidth : -boardWidth
  return {
    position,
    wrappedPosition: [position[0] + wrapOffset, position[1], position[2]],
  }
}

export function positionsEqual(a: GridPosition, b: GridPosition): boolean {
  return a.row === b.row && a.col === b.col
}
