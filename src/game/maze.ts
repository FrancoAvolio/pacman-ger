import type { GridPosition, MazeCell } from './types'

// The text map is the source of truth for both gameplay and rendering.
// Keeping it human-readable makes future maze tuning safe and quick.
export const MAZE_LAYOUT = [
  '#####################',
  '#o........#........o#',
  '#.###.###.#.###.###.#',
  '#...................#',
  '#.###.#.#####.#.###.#',
  '#.....#...#...#.....#',
  '#####.###.#.###.#####',
  '#.........#.........#',
  '#.###.##.....##.###.#',
  '#.....#..GGGG.#.....#',
  '###.#.#.#####.#.#.###',
  '#...#.#...P...#.#...#',
  '#.###.###.#.###.###.#',
  '#o..#.....#.....#..o#',
  '###.#.###.#.###.#.###',
  '#.....#...#...#.....#',
  '#.#######.#.#######.#',
  '#...................#',
  '#.###.###.#.###.###.#',
  '#o.................o#',
  '#####################',
] as const

export const MAZE_ROWS = MAZE_LAYOUT.length
export const MAZE_COLS = MAZE_LAYOUT[0].length

export function cellAt(position: GridPosition): MazeCell {
  if (
    position.row < 0 ||
    position.row >= MAZE_ROWS ||
    position.col < 0 ||
    position.col >= MAZE_COLS
  ) {
    return '#'
  }

  return MAZE_LAYOUT[position.row][position.col] as MazeCell
}

export function isWalkable(position: GridPosition): boolean {
  return cellAt(position) !== '#'
}

export function findCells(target: MazeCell): GridPosition[] {
  const positions: GridPosition[] = []

  MAZE_LAYOUT.forEach((row, rowIndex) => {
    Array.from(row).forEach((cell, colIndex) => {
      if (cell === target) positions.push({ row: rowIndex, col: colIndex })
    })
  })

  return positions
}

export function gridToWorld({ row, col }: GridPosition): [number, number, number] {
  return [col - (MAZE_COLS - 1) / 2, 0, row - (MAZE_ROWS - 1) / 2]
}

export const PLAYER_SPAWN = findCells('P')[0]

export function tileKey({ row, col }: GridPosition): string {
  return `${row}:${col}`
}

export function getInitialPellets(): Set<string> {
  const pellets = new Set<string>()

  for (const cell of [...findCells('.'), ...findCells('o')]) {
    pellets.add(tileKey(cell))
  }

  return pellets
}
