import type { LevelConfig } from './levels'
import type { Difficulty, GhostPersonality } from './types'

export type DifficultyConfig = {
  id: Difficulty
  label: string
  description: string
  ghostSpeedMultiplier: number
  frightenedDurationMultiplier: number
  ghostReleaseMultiplier: number
  startingLives: number
}

export const DEFAULT_DIFFICULTY: Difficulty = 'normal'

export const DIFFICULTY_ORDER: readonly Difficulty[] = [
  'tranqui',
  'normal',
  'arcade',
]

export const DIFFICULTY_CONFIG: Readonly<Record<Difficulty, DifficultyConfig>> = {
  tranqui: {
    id: 'tranqui',
    label: 'TRANQUI',
    description: 'Para conocer el mapa sin sufrir tanto.',
    ghostSpeedMultiplier: 0.82,
    frightenedDurationMultiplier: 1.3,
    ghostReleaseMultiplier: 1.25,
    startingLives: 5,
  },
  normal: {
    id: 'normal',
    label: 'NORMAL',
    description: 'El equilibrio justo.',
    ghostSpeedMultiplier: 0.94,
    frightenedDurationMultiplier: 1,
    ghostReleaseMultiplier: 1,
    startingLives: 3,
  },
  arcade: {
    id: 'arcade',
    label: 'ARCADE',
    description: 'Después no te quejes.',
    ghostSpeedMultiplier: 1.08,
    frightenedDurationMultiplier: 0.8,
    ghostReleaseMultiplier: 0.88,
    startingLives: 3,
  },
}

export function getDifficultyConfig(difficulty: Difficulty): DifficultyConfig {
  return DIFFICULTY_CONFIG[difficulty]
}

export function getStartingLives(difficulty: Difficulty): number {
  return getDifficultyConfig(difficulty).startingLives
}

export function getEffectiveGhostSpeed(
  baseSpeed: number,
  level: LevelConfig,
  difficulty: Difficulty,
): number {
  return baseSpeed * level.ghostSpeedMultiplier * getDifficultyConfig(difficulty).ghostSpeedMultiplier
}

export function getEffectiveFrightenedDuration(
  level: LevelConfig,
  difficulty: Difficulty,
): number {
  return Math.round(
    level.frightenedDurationMs *
      getDifficultyConfig(difficulty).frightenedDurationMultiplier,
  )
}

export function getEffectiveGhostReleaseDelay(
  level: LevelConfig,
  difficulty: Difficulty,
  personality: GhostPersonality,
): number {
  return Math.round(
    level.ghostReleaseDelaysMs[personality] *
      getDifficultyConfig(difficulty).ghostReleaseMultiplier,
  )
}

export function cycleDifficulty(
  difficulty: Difficulty,
  direction: 'next' | 'previous',
): Difficulty {
  const currentIndex = DIFFICULTY_ORDER.indexOf(difficulty)
  const offset = direction === 'next' ? 1 : -1
  const nextIndex =
    (currentIndex + offset + DIFFICULTY_ORDER.length) % DIFFICULTY_ORDER.length
  return DIFFICULTY_ORDER[nextIndex]
}
