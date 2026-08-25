import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LEVEL,
  getLevelConfig,
  LEVEL_1_LAYOUT,
  LEVELS,
  type LevelConfig,
} from './levels'
import { validateCampaign, validateLevelConfig } from './levelValidation'
import { cellAt, findCells, getInitialPellets, isWalkable } from './maze'

describe('level campaign', () => {
  it('defines exactly three increasingly difficult levels without slowing Pac-Man', () => {
    expect(LEVELS.map(({ id }) => id)).toEqual([1, 2, 3])
    expect(LEVELS.map(({ ghostSpeedMultiplier }) => ghostSpeedMultiplier)).toEqual([
      1,
      1.06,
      1.12,
    ])
    expect(LEVELS.map(({ frightenedDurationMs }) => frightenedDurationMs)).toEqual([
      7_000,
      6_000,
      5_000,
    ])
    expect(LEVELS.every(({ pacmanSpeedMultiplier }) => pacmanSpeedMultiplier >= 1)).toBe(true)
    expect(LEVELS.every(({ tunnels }) => tunnels.length > 0)).toBe(true)
    expect(validateCampaign(LEVELS)).toEqual([])
    expect(getLevelConfig(1)).toBe(DEFAULT_LEVEL)
    expect(() => getLevelConfig(4)).toThrow(RangeError)
  })

  it.each([
    { levelIndex: 0, pellets: 221, walkable: 228, powerPellets: 6 },
    { levelIndex: 1, pellets: 219, walkable: 227, powerPellets: 6 },
    { levelIndex: 2, pellets: 234, walkable: 240, powerPellets: 6 },
  ])(
    'validates every spawn and collectible in level $levelIndex',
    ({ levelIndex, pellets, walkable, powerPellets }) => {
      const level = LEVELS[levelIndex]
      const result = validateLevelConfig(level)

      expect(result.valid, result.errors.join('\n')).toBe(true)
      expect(result.stats).toMatchObject({
        rows: 21,
        cols: 21,
        pellets,
        powerPellets,
        walkableCells: walkable,
        reachableCells: walkable,
      })
      expect(findCells('P', level)).toHaveLength(1)
      expect(findCells('G', level)).toHaveLength(4)
      expect(getInitialPellets(level).size).toBe(pellets)
      expect(isWalkable(level.bonus.spawnTile, level)).toBe(true)
      expect(cellAt(level.bonus.spawnTile, level)).not.toBe('#')
      expect(cellAt(level.bonus.spawnTile, level)).not.toBe('G')
    },
  )

  it('keeps the new wall compositions symmetric and free of dead ends', () => {
    for (const level of LEVELS.slice(1)) {
      const wallMaskIsSymmetric = level.maze.every((row) => {
        const mask = Array.from(row, (cell) => (cell === '#' ? '#' : '.')).join('')
        return mask === Array.from(mask).reverse().join('')
      })
      expect(wallMaskIsSymmetric).toBe(true)
      expect(validateLevelConfig(level).stats.deadEnds).toEqual([])
    }
  })

  it('keeps the original Level 1 interior and adds only its tunnel gates', () => {
    expect(LEVELS[0].maze).toBe(LEVEL_1_LAYOUT)
    expect(LEVEL_1_LAYOUT[11]).toBe('#...#.#...P...#.#...#')
    expect(LEVEL_1_LAYOUT[7]).toBe(' .........#......... ')
    expect(LEVELS[0].tunnels).toEqual([
      {
        axis: 'horizontal',
        left: { row: 7, col: 0 },
        right: { row: 7, col: 20 },
      },
    ])
    expect(getInitialPellets(LEVELS[0]).size).toBe(221)
  })
})

describe('pure level validation', () => {
  function withMaze(maze: readonly string[]): LevelConfig {
    return { ...DEFAULT_LEVEL, maze }
  }

  it('reports malformed dimensions and spawn counts without throwing', () => {
    const malformed = withMaze([
      LEVEL_1_LAYOUT[0].slice(1),
      ...LEVEL_1_LAYOUT.slice(1).map((row) => row.replace('P', '.').replaceAll('G', '.')),
    ])
    const result = validateLevelConfig(malformed)

    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.includes('21x21'))).toBe(true)
    expect(result.errors.some((error) => error.includes('player spawn'))).toBe(true)
    expect(result.errors.some((error) => error.includes('ghost spawns'))).toBe(true)
  })

  it('rejects unreachable pellets and invalid tunnel endpoints', () => {
    const isolatedRows: string[] = [...LEVEL_1_LAYOUT]
    isolatedRows[15] = `${isolatedRows[15].slice(0, 8)}#${isolatedRows[15].slice(9)}`
    const invalid = withMaze(isolatedRows)
    invalid.tunnels = [
      {
        axis: 'horizontal',
        left: { row: 0, col: 0 },
        right: { row: 0, col: 20 },
      },
    ]

    const result = validateLevelConfig(invalid)
    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.includes('unreachable'))).toBe(true)
    expect(result.errors).toContain('tunnel endpoints must both be walkable')
  })
})
