import { describe, expect, it } from 'vitest'
import {
  cellAt,
  findCells,
  getInitialPellets,
  gridToActorWorld,
  gridToWorld,
  isWalkable,
  MAZE_COLS,
  MAZE_LAYOUT,
  MAZE_ROWS,
  PLAYER_SPAWN,
  tileKey,
} from './maze'

describe('maze', () => {
  it('has consistent dimensions and required spawns', () => {
    expect(MAZE_ROWS).toBe(21)
    expect(MAZE_COLS).toBe(21)
    expect(MAZE_LAYOUT.every((row) => row.length === MAZE_COLS)).toBe(true)
    expect(findCells('P')).toHaveLength(1)
    expect(findCells('G')).toHaveLength(4)
  })

  it('keeps every walkable cell connected to the player spawn', () => {
    const queue = [PLAYER_SPAWN]
    const visited = new Set([tileKey(PLAYER_SPAWN)])

    while (queue.length > 0) {
      const current = queue.shift()!
      for (const [rowOffset, colOffset] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const next = {
          row: current.row + rowOffset,
          col: current.col + colOffset,
        }
        const key = tileKey(next)
        if (isWalkable(next) && !visited.has(key)) {
          visited.add(key)
          queue.push(next)
        }
      }
    }

    const walkableCount = MAZE_LAYOUT.join('').replaceAll('#', '').length
    expect(visited.size).toBe(walkableCount)
  })

  it('creates one unique entry for every pellet', () => {
    const expected = findCells('.').length + findCells('o').length
    const pellets = getInitialPellets()
    expect(pellets.size).toBe(expected)
    expect(pellets.size).toBe(221)
  })

  it('treats out-of-bounds positions as walls and converts grid coordinates', () => {
    expect(cellAt({ row: -1, col: 0 })).toBe('#')
    expect(cellAt({ row: MAZE_ROWS, col: 0 })).toBe('#')
    expect(isWalkable(PLAYER_SPAWN)).toBe(true)
    expect(gridToWorld({ row: 10, col: 10 })).toEqual([0, 0, 0])
    expect(tileKey({ row: 3, col: 7 })).toBe('3:7')
  })

  it('adds render-only breathing room to the outer playable rows', () => {
    expect(gridToActorWorld({ row: 1, col: 10 })).toEqual([0, 0, -8.76])
    expect(gridToActorWorld({ row: 19, col: 10 })).toEqual([0, 0, 8.76])
    expect(gridToActorWorld({ row: 10, col: 10 })).toEqual([0, 0, 0])
    expect(gridToWorld({ row: 1, col: 10 })).toEqual([0, 0, -9])
  })
})
