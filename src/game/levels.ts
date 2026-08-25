import type { Direction, GhostPersonality, GridPosition } from './types'

export type LevelNumber = 1 | 2 | 3

export type HorizontalTunnel = {
  axis: 'horizontal'
  left: GridPosition
  right: GridPosition
}

export type BonusConfig = {
  spawnTile: GridPosition
  pelletThreshold: number
  visibleDurationMs: number
  points: number
}

export type LevelConfig = {
  id: LevelNumber
  maze: readonly string[]
  ghostSpeedMultiplier: number
  frightenedDurationMs: number
  pacmanSpeedMultiplier: number
  ghostReleaseDelaysMs: Readonly<Record<GhostPersonality, number>>
  tunnels: readonly HorizontalTunnel[]
  bonus: BonusConfig
}

const RELEASE_DELAYS_MS: Readonly<Record<GhostPersonality, number>> = {
  RED: 0,
  PINK: 1_500,
  CYAN: 3_000,
  ORANGE: 5_000,
}

const BONUS_DEFAULTS = {
  pelletThreshold: 0.6,
  visibleDurationMs: 9_000,
  points: 1_000,
} as const

// Level 1 preserves the original composition, with two border cells opened so
// the side corridor behaves like a classic wraparound tunnel.
export const LEVEL_1_LAYOUT = [
  '#####################',
  '#o........#........o#',
  '#.###.###.#.###.###.#',
  '#...................#',
  '#.###.#.#####.#.###.#',
  '#.....#...#...#.....#',
  '#####.###.#.###.#####',
  ' .........#......... ',
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

export const LEVEL_2_LAYOUT = [
  '#####################',
  '#o.......###.......o#',
  '#.###.##.###.##.###.#',
  '#.....#.......#.....#',
  '#.###.#.#####.#.###.#',
  '#.#...#...#...#...#.#',
  '#.#.#####.#.#####.#.#',
  ' .........#......... ',
  '###.###.......###.###',
  '#.....#..GGGG.#.....#',
  '#.###.#.#####.#.###.#',
  '#.....#... ...#.....#',
  '###.#.###.#.###.#.###',
  '#o..#.....P.....#..o#',
  '#.#####.#####.#####.#',
  '#.......#...#.......#',
  '#.###.#.#.#.#.#.###.#',
  '#...#.#...#...#.#...#',
  '#.#.#.###.#.###.#.#.#',
  '#o.................o#',
  '#####################',
] as const

export const LEVEL_3_LAYOUT = [
  '#####################',
  '#o....#.......#....o#',
  '#.###.#.##.##.#.###.#',
  '#...................#',
  '#.###.###.#.###.###.#',
  '#...#.....#.....#...#',
  '###.#.###.#.###.#.###',
  '#.......#...#.......#',
  '#.###.#.......#.###.#',
  '#.....#.GGGG..#.....#',
  '....#.#.#####.#.#....',
  '#.....#... ...#.....#',
  '#.###.###.#.###.###.#',
  '#o.................o#',
  '###.#.###.#.###.#.###',
  '#...#.....P.....#...#',
  '#.#####.#####.#####.#',
  '#...................#',
  '#.###.#.##.##.#.###.#',
  '#o....#.......#....o#',
  '#####################',
] as const

function horizontalTunnel(row: number): readonly HorizontalTunnel[] {
  return [
    {
      axis: 'horizontal',
      left: { row, col: 0 },
      right: { row, col: 20 },
    },
  ]
}

const LEVEL_1_TUNNELS = horizontalTunnel(7)
const LEVEL_2_TUNNELS = horizontalTunnel(7)
const LEVEL_3_TUNNELS = horizontalTunnel(10)

export const LEVELS: readonly LevelConfig[] = [
  {
    id: 1,
    maze: LEVEL_1_LAYOUT,
    ghostSpeedMultiplier: 1,
    frightenedDurationMs: 7_000,
    pacmanSpeedMultiplier: 1,
    ghostReleaseDelaysMs: RELEASE_DELAYS_MS,
    tunnels: LEVEL_1_TUNNELS,
    bonus: {
      ...BONUS_DEFAULTS,
      // The player spawn is central, pellet-free and vacated long before 60%.
      spawnTile: { row: 11, col: 10 },
    },
  },
  {
    id: 2,
    maze: LEVEL_2_LAYOUT,
    ghostSpeedMultiplier: 1.06,
    frightenedDurationMs: 6_000,
    pacmanSpeedMultiplier: 1,
    ghostReleaseDelaysMs: RELEASE_DELAYS_MS,
    tunnels: LEVEL_2_TUNNELS,
    bonus: {
      ...BONUS_DEFAULTS,
      spawnTile: { row: 11, col: 10 },
    },
  },
  {
    id: 3,
    maze: LEVEL_3_LAYOUT,
    ghostSpeedMultiplier: 1.12,
    frightenedDurationMs: 5_000,
    pacmanSpeedMultiplier: 1,
    ghostReleaseDelaysMs: RELEASE_DELAYS_MS,
    tunnels: LEVEL_3_TUNNELS,
    bonus: {
      ...BONUS_DEFAULTS,
      spawnTile: { row: 11, col: 10 },
    },
  },
]

export const DEFAULT_LEVEL = LEVELS[0]
export const FINAL_LEVEL = LEVELS[LEVELS.length - 1]

export function getLevelConfig(level: number): LevelConfig {
  const config = LEVELS.find(({ id }) => id === level)
  if (!config) throw new RangeError(`Unknown level: ${level}`)
  return config
}

export function getTunnelDestination(
  level: LevelConfig,
  position: GridPosition,
  direction: Direction,
): GridPosition | null {
  for (const tunnel of level.tunnels) {
    if (
      direction === 'LEFT' &&
      position.row === tunnel.left.row &&
      position.col === tunnel.left.col
    ) {
      return { ...tunnel.right }
    }
    if (
      direction === 'RIGHT' &&
      position.row === tunnel.right.row &&
      position.col === tunnel.right.col
    ) {
      return { ...tunnel.left }
    }
  }

  return null
}
