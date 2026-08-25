import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTY_CONFIG,
  getEffectiveFrightenedDuration,
  getEffectiveGhostReleaseDelay,
  getEffectiveGhostSpeed,
  getStartingLives,
} from './difficulty'
import { GHOST_SPEED } from './constants'
import { getLevelConfig } from './levels'

describe('difficulty balance', () => {
  it('uses NORMAL as the default with the requested starting lives', () => {
    expect(DEFAULT_DIFFICULTY).toBe('normal')
    expect(getStartingLives('tranqui')).toBe(5)
    expect(getStartingLives('normal')).toBe(3)
    expect(getStartingLives('arcade')).toBe(3)
  })

  it('combines level and difficulty ghost speed multipliers', () => {
    const levelTwo = getLevelConfig(2)
    expect(getEffectiveGhostSpeed(GHOST_SPEED, levelTwo, 'normal')).toBeCloseTo(
      GHOST_SPEED * 1.06 * 0.94,
    )
    expect(getEffectiveGhostSpeed(GHOST_SPEED, levelTwo, 'arcade')).toBeCloseTo(
      GHOST_SPEED * 1.06 * 1.08,
    )
  })

  it('keeps Level 3 harder than Level 1 for every difficulty', () => {
    for (const difficulty of ['tranqui', 'normal', 'arcade'] as const) {
      expect(
        getEffectiveGhostSpeed(GHOST_SPEED, getLevelConfig(3), difficulty),
      ).toBeGreaterThan(
        getEffectiveGhostSpeed(GHOST_SPEED, getLevelConfig(1), difficulty),
      )
    }
  })

  it('orders Level 1 from most forgiving to hardest', () => {
    const level = getLevelConfig(1)
    expect(getEffectiveGhostSpeed(GHOST_SPEED, level, 'tranqui')).toBeLessThan(
      getEffectiveGhostSpeed(GHOST_SPEED, level, 'normal'),
    )
    expect(getEffectiveGhostSpeed(GHOST_SPEED, level, 'normal')).toBeLessThan(
      getEffectiveGhostSpeed(GHOST_SPEED, level, 'arcade'),
    )
  })

  it('modifies frightened duration without changing level progression', () => {
    expect(getEffectiveFrightenedDuration(getLevelConfig(1), 'tranqui')).toBe(9_100)
    expect(getEffectiveFrightenedDuration(getLevelConfig(1), 'normal')).toBe(7_000)
    expect(getEffectiveFrightenedDuration(getLevelConfig(1), 'arcade')).toBe(5_600)
    expect(getEffectiveFrightenedDuration(getLevelConfig(3), 'tranqui')).toBe(
      6_500,
    )
  })

  it('modifies ghost release delays independently of ghost AI', () => {
    const level = getLevelConfig(1)
    expect(getEffectiveGhostReleaseDelay(level, 'tranqui', 'ORANGE')).toBe(6_250)
    expect(getEffectiveGhostReleaseDelay(level, 'normal', 'ORANGE')).toBe(5_000)
    expect(getEffectiveGhostReleaseDelay(level, 'arcade', 'ORANGE')).toBe(4_400)
    expect(DIFFICULTY_CONFIG.arcade.ghostSpeedMultiplier).toBeGreaterThan(1)
  })
})
