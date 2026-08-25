import { describe, expect, it, vi } from 'vitest'
import { getLevelConfig, LEVELS } from './levels'
import { isWalkable } from './maze'
import { canMove } from './movement'
import {
  chooseGhostDirection,
  getFrightenedVisualState,
  getGhostTarget,
  isGhostReleased,
  SCATTER_TARGETS,
  scheduledGhostState,
  shortestPathDistance,
  shouldGhostMove,
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

  it('uses tunnel-aware graph distance instead of screen-space distance', () => {
    const level = getLevelConfig(3)

    expect(shortestPathDistance({ row: 10, col: 0 }, { row: 10, col: 20 }, level)).toBe(1)
    expect(
      chooseGhostDirection({
        tile: { row: 10, col: 2 },
        currentDirection: 'NONE',
        target: { row: 10, col: 19 },
        state: 'CHASE',
        mayReverse: true,
        level,
      }),
    ).toBe('LEFT')

    expect(
      getGhostTarget(
        'PINK',
        { row: 10, col: 0 },
        'LEFT',
        { row: 10, col: 10 },
        { row: 10, col: 10 },
        level,
      ),
    ).toEqual({ row: 10, col: 17 })
  })

  it('uses walkable scatter targets in every level', () => {
    for (const level of LEVELS) {
      for (const target of Object.values(SCATTER_TARGETS)) {
        expect(isWalkable(target, level)).toBe(true)
      }
    }
  })

  it('releases ghosts at configurable staggered boundaries', () => {
    const level = getLevelConfig(2)

    expect(isGhostReleased('RED', 0, level)).toBe(true)
    expect(isGhostReleased('PINK', 1_499, level)).toBe(false)
    expect(isGhostReleased('PINK', 1_500, level)).toBe(true)
    expect(isGhostReleased('CYAN', 2_999, level)).toBe(false)
    expect(isGhostReleased('CYAN', 3_000, level)).toBe(true)
    expect(isGhostReleased('ORANGE', 4_999, level)).toBe(false)
    expect(isGhostReleased('ORANGE', 5_000, level)).toBe(true)
    expect(shouldGhostMove('ORANGE', 0, 'FRIGHTENED', level)).toBe(false)
    expect(shouldGhostMove('ORANGE', 0, 'EATEN', level)).toBe(true)
  })

  it('flashes blue and white faster during the final frightened second', () => {
    expect(getFrightenedVisualState(2_001)).toBe('BLUE')
    expect(getFrightenedVisualState(2_000)).toBe('BLUE')
    expect(getFrightenedVisualState(1_750)).toBe('WHITE')
    expect(getFrightenedVisualState(1_500)).toBe('BLUE')
    expect(getFrightenedVisualState(1_001)).toBe('WHITE')
    expect(getFrightenedVisualState(1_000)).toBe('BLUE')
    expect(getFrightenedVisualState(875)).toBe('WHITE')
    expect(getFrightenedVisualState(750)).toBe('BLUE')
    expect(getFrightenedVisualState(0)).toBe('NORMAL')
  })
})
