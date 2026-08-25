import { describe, expect, it } from 'vitest'
import { PLAYER_SPAWN } from './maze'
import { canMove, nextTile, positionsEqual } from './movement'

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
})
