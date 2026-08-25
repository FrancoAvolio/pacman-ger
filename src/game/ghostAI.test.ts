import { describe, expect, it, vi } from 'vitest'
import { canMove } from './movement'
import {
  chooseGhostDirection,
  getGhostTarget,
  SCATTER_TARGETS,
  scheduledGhostState,
} from './ghostAI'

describe('ghost AI', () => {
  it('alternates its documented scatter/chase schedule', () => {
    expect(scheduledGhostState(0)).toBe('SCATTER')
    expect(scheduledGhostState(6.99)).toBe('SCATTER')
    expect(scheduledGhostState(7)).toBe('CHASE')
    expect(scheduledGhostState(27)).toBe('SCATTER')
    expect(scheduledGhostState(34)).toBe('CHASE')
    expect(scheduledGhostState(100)).toBe('CHASE')
  })

  it('computes distinct chase targets for every personality', () => {
    const player = { row: 10, col: 10 }
    const red = { row: 5, col: 4 }
    const ghost = { row: 18, col: 18 }

    expect(getGhostTarget('RED', player, 'RIGHT', red, ghost)).toEqual(player)
    expect(getGhostTarget('PINK', player, 'RIGHT', red, ghost)).toEqual({ row: 10, col: 14 })
    expect(getGhostTarget('CYAN', player, 'UP', red, ghost)).toEqual({ row: 11, col: 16 })
    expect(getGhostTarget('ORANGE', player, 'LEFT', red, ghost)).toEqual(player)
    expect(getGhostTarget('ORANGE', player, 'LEFT', red, { row: 11, col: 11 })).toEqual(
      SCATTER_TARGETS.ORANGE,
    )
  })

  it('does not reverse in a corridor unless a state change allows it', () => {
    const tile = { row: 3, col: 10 }
    const target = { row: 3, col: 0 }

    expect(
      chooseGhostDirection({
        tile,
        currentDirection: 'RIGHT',
        target,
        state: 'CHASE',
        mayReverse: false,
      }),
    ).toBe('RIGHT')

    expect(
      chooseGhostDirection({
        tile,
        currentDirection: 'RIGHT',
        target,
        state: 'CHASE',
        mayReverse: true,
      }),
    ).toBe('LEFT')
  })

  it('always chooses a walkable direction while frightened', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const tile = { row: 3, col: 9 }
    const direction = chooseGhostDirection({
      tile,
      currentDirection: 'RIGHT',
      target: { row: 0, col: 0 },
      state: 'FRIGHTENED',
      mayReverse: true,
    })
    expect(canMove(tile, direction)).toBe(true)
  })
})
