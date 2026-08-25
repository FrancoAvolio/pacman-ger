import { LEVEL_1_LAYOUT } from './levels'
import type { LevelConfig } from './levels'
import type { GridPosition, MazeCell } from './types'

export type MazeLayout = readonly string[]
export type MazeSource = MazeLayout | Pick<LevelConfig, 'maze'>

// Backwards-compatible Level 1 exports. New code should pass the active maze.
export const MAZE_LAYOUT = LEVEL_1_LAYOUT
export const MAZE_ROWS = MAZE_LAYOUT.length
export const MAZE_COLS = MAZE_LAYOUT[0].length

function sourceLayout(source: MazeSource): MazeLayout {
  return 'maze' in source ? source.maze : source
}

export function cellAt(
  position: GridPosition,
  source: MazeSource = MAZE_LAYOUT,
): MazeCell {
  const layout = sourceLayout(source)
  const cell = layout[position.row]?.[position.col]
  return (cell ?? '#') as MazeCell
}

export function isWalkable(
  position: GridPosition,
  source: MazeSource = MAZE_LAYOUT,
): boolean {
  return cellAt(position, source) !== '#'
}

export function findCells(
  target: MazeCell,
  source: MazeSource = MAZE_LAYOUT,
): GridPosition[] {
  const layout = sourceLayout(source)
  const positions: GridPosition[] = []

  layout.forEach((row, rowIndex) => {
    Array.from(row).forEach((cell, colIndex) => {
      if (cell === target) positions.push({ row: rowIndex, col: colIndex })
    })
  })

  return positions
}

export function gridToWorld(
  { row, col }: GridPosition,
  source: MazeSource = MAZE_LAYOUT,
): [number, number, number] {
  const layout = sourceLayout(source)
  const rows = layout.length
  const cols = layout[0]?.length ?? 0
  return [col - (cols - 1) / 2, 0, row - (rows - 1) / 2]
}

// The first and last playable rows need a little render-only breathing room:
// perspective otherwise makes actors and pellets appear attached to the outer
// wall. Logical tiles and navigation remain completely unchanged.
export function gridToActorWorld(
  position: GridPosition,
  source: MazeSource = MAZE_LAYOUT,
): [number, number, number] {
  const layout = sourceLayout(source)
  const world = gridToWorld(position, layout)
  const edgeInset = 0.24

  if (position.row === 1) world[2] += edgeInset
  if (position.row === layout.length - 2) world[2] -= edgeInset
  return world
}

export function getPlayerSpawn(source: MazeSource = MAZE_LAYOUT): GridPosition {
  const spawn = findCells('P', source)[0]
  if (!spawn) throw new Error('Maze does not contain a player spawn')
  return spawn
}

export const PLAYER_SPAWN = getPlayerSpawn()

export function tileKey({ row, col }: GridPosition): string {
  return `${row}:${col}`
}

export function getInitialPellets(source: MazeSource = MAZE_LAYOUT): Set<string> {
  const pellets = new Set<string>()

  for (const cell of [...findCells('.', source), ...findCells('o', source)]) {
    pellets.add(tileKey(cell))
  }

  return pellets
}
