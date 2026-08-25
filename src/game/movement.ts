import { DIRECTION_VECTORS } from './constants'
import { isWalkable } from './maze'
import type { Direction, GridPosition } from './types'

export function nextTile(
  position: GridPosition,
  direction: Direction,
): GridPosition {
  if (direction === 'NONE') return position

  const offset = DIRECTION_VECTORS[direction]
  return {
    row: position.row + offset.row,
    col: position.col + offset.col,
  }
}

export function canMove(position: GridPosition, direction: Direction): boolean {
  return direction !== 'NONE' && isWalkable(nextTile(position, direction))
}

export function positionsEqual(a: GridPosition, b: GridPosition): boolean {
  return a.row === b.row && a.col === b.col
}
