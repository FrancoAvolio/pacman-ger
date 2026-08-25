import { describe, expect, it } from 'vitest'
import { getLevelConfig } from './levels'
import { getInitialPellets, gridToWorld, PLAYER_SPAWN, tileKey } from './maze'
import {
  canMove,
  interpolateMove,
  nextTile,
  positionsEqual,
  resolveMove,
} from './movement'

describe('movement', () => {
  it('moves one logical cell in each direction', () => {
    const origin = { row: 5, col: 5 }
    expect(nextTile(origin, 'UP')).toEqual({ row: 4, col: 5 })
    expect(nextTile(origin, 'DOWN')).toEqual({ row: 6, col: 5 })
    expect(nextTile(origin, 'LEFT')).toEqual({ row: 5, col: 4 })
    expect(nextTile(origin, 'RIGHT')).toEqual({ row: 5, col: 6 })
    expect(nextTile(origin, 'NONE')).toBe(origin)
  })

  it('allows corridors and blocks walls at the player spawn', () => {
    expect(canMove(PLAYER_SPAWN, 'LEFT')).toBe(true)
    expect(canMove(PLAYER_SPAWN, 'RIGHT')).toBe(true)
    expect(canMove(PLAYER_SPAWN, 'UP')).toBe(false)
    expect(canMove(PLAYER_SPAWN, 'DOWN')).toBe(false)
    expect(canMove(PLAYER_SPAWN, 'NONE')).toBe(false)
  })

  it('compares logical positions by value', () => {
    expect(positionsEqual({ row: 1, col: 2 }, { row: 1, col: 2 })).toBe(true)
    expect(positionsEqual({ row: 1, col: 2 }, { row: 2, col: 1 })).toBe(false)
  })

  it.each([
    [1, 7],
    [2, 7],
    [3, 10],
  ] as const)('resolves both directions of the Level %i side tunnel', (levelId, row) => {
    const level = getLevelConfig(levelId)

    expect(nextTile({ row, col: 0 }, 'LEFT', level)).toEqual({ row, col: 20 })
    expect(nextTile({ row, col: 20 }, 'RIGHT', level)).toEqual({ row, col: 0 })
    expect(canMove({ row, col: 0 }, 'LEFT', level)).toBe(true)
    expect(canMove({ row, col: 20 }, 'RIGHT', level)).toBe(true)

    expect(nextTile({ row, col: 0 }, 'RIGHT', level)).toEqual({ row, col: 1 })
    expect(nextTile({ row, col: 20 }, 'LEFT', level)).toEqual({ row, col: 19 })
    expect(canMove({ row: 0, col: 10 }, 'UP', level)).toBe(false)
  })

  it('keeps pellet collection valid on the Level 3 tunnel entrances', () => {
    const level = getLevelConfig(3)

    const pellets = getInitialPellets(level)
    expect(pellets.has(tileKey(nextTile({ row: 10, col: 0 }, 'LEFT', level)))).toBe(true)
    expect(pellets.has(tileKey(nextTile({ row: 10, col: 20 }, 'RIGHT', level)))).toBe(true)
  })

  it.each([1, 2, 3] as const)(
    'interpolates the Level %i wrap with a seamless counterpart',
    (levelId) => {
      const level = getLevelConfig(levelId)
      const tunnel = level.tunnels[0]
      const move = resolveMove(tunnel.left, 'LEFT', level)
      const halfway = interpolateMove(move, 0.5, level)
      const completed = interpolateMove(move, 1, level)

      expect(move).toMatchObject({
        to: tunnel.right,
        visualTo: { row: tunnel.left.row, col: -1 },
        wrapped: true,
      })
      expect(halfway.position[0]).toBe(-10.5)
      expect(halfway.wrappedPosition?.[0]).toBe(10.5)
      expect(completed.wrappedPosition).toEqual(gridToWorld(move.to, level))

      const start = gridToWorld(move.from, level)
      expect(Math.abs(completed.position[0] - start[0])).toBe(1)

      const reverseMove = resolveMove(tunnel.right, 'RIGHT', level)
      expect(interpolateMove(reverseMove, 1, level).wrappedPosition).toEqual(
        gridToWorld(tunnel.left, level),
      )
    },
  )

  it('does not create a counterpart for ordinary movement', () => {
    const move = resolveMove({ row: 3, col: 9 }, 'RIGHT')
    expect(interpolateMove(move, 0.5)).toEqual({
      position: [-0.5, 0, -7],
      wrappedPosition: null,
    })
  })
})
