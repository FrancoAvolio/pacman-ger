import { create } from 'zustand'
import { RESPAWN_GRACE_MS } from '../game/constants'
import {
  cycleDifficulty as cycleDifficultyValue,
  DEFAULT_DIFFICULTY,
  getEffectiveFrightenedDuration,
  getStartingLives,
} from '../game/difficulty'
import { DEV_MODE } from '../game/dev'
import {
  canCollectTicket,
  getTicketExpiry,
  isTicketExpired,
  shouldSpawnTicket,
  type TicketPhase,
} from '../game/bonus'
import { audio } from '../game/audio'
import {
  DEFAULT_LEVEL,
  FINAL_LEVEL,
  getLevelConfig,
  type LevelNumber,
} from '../game/levels'
import { cellAt, getInitialPellets, getPlayerSpawn, tileKey } from '../game/maze'
import type { Difficulty, Direction, GameStatus, GridPosition } from '../game/types'

function readHighScore(): number {
  try {
    const value = Number.parseInt(localStorage.getItem('geral-high-score') ?? '0', 10)
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

function readMuted(): boolean {
  try {
    return localStorage.getItem('geral-muted') === 'true'
  } catch {
    return false
  }
}

function persistHighScore(highScore: number): void {
  try {
    localStorage.setItem('geral-high-score', String(highScore))
  } catch {
    // Storage can be unavailable in private browsing; in-memory play continues.
  }
}

const initialMuted = readMuted()
audio.setMuted(initialMuted)

type GameStore = {
  roundId: number
  level: LevelNumber
  status: GameStatus
  score: number
  highScore: number
  lives: number
  difficulty: Difficulty
  remainingPellets: Set<string>
  pelletsEaten: number
  frightenedUntil: number
  invulnerableUntil: number
  ghostCombo: number
  pausedAt: number | null
  cameraPunch: number
  direction: Direction
  queuedDirection: Direction
  playerTile: GridPosition
  ticketPhase: TicketPhase
  ticketExpiresAt: number
  ticketCollectionId: number
  muted: boolean
  devInvulnerable: boolean
  devDebug: boolean
  setDifficulty: (difficulty: Difficulty) => void
  cycleDifficulty: (direction: 'next' | 'previous') => void
  queueDirection: (direction: Direction) => void
  setDirection: (direction: Direction) => void
  setPlayerTile: (position: GridPosition) => void
  collectPellet: (position: GridPosition) => void
  collectTicket: (position: GridPosition) => void
  expireTicket: (now?: number) => void
  eatGhost: () => void
  playerHit: () => void
  finishDeath: () => void
  finishLevelTransition: () => void
  beginLevel: () => void
  togglePause: () => void
  toggleMute: () => void
  startGame: () => void
  newGame: () => void
  returnToMenu: () => void
  resetPlayer: () => void
  devLoadLevel: (level: LevelNumber) => void
  devReloadLevel: () => void
  toggleDevInvulnerable: () => void
  toggleDevDebug: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  roundId: 0,
  level: DEFAULT_LEVEL.id,
  status: 'ready',
  score: 0,
  highScore: readHighScore(),
  lives: getStartingLives(DEFAULT_DIFFICULTY),
  difficulty: DEFAULT_DIFFICULTY,
  remainingPellets: getInitialPellets(DEFAULT_LEVEL.maze),
  pelletsEaten: 0,
  frightenedUntil: 0,
  invulnerableUntil: 0,
  ghostCombo: 0,
  pausedAt: null,
  cameraPunch: 0,
  direction: 'NONE',
  queuedDirection: 'NONE',
  playerTile: getPlayerSpawn(DEFAULT_LEVEL.maze),
  ticketPhase: 'waiting',
  ticketExpiresAt: 0,
  ticketCollectionId: 0,
  muted: initialMuted,
  devInvulnerable: false,
  devDebug: false,

  setDifficulty: (difficulty) =>
    set((state) =>
      state.status === 'ready'
        ? { difficulty, lives: getStartingLives(difficulty) }
        : state,
    ),

  cycleDifficulty: (direction) =>
    set((state) => {
      if (state.status !== 'ready') return state
      const difficulty = cycleDifficultyValue(state.difficulty, direction)
      return { difficulty, lives: getStartingLives(difficulty) }
    }),

  queueDirection: (queuedDirection) => set({ queuedDirection }),
  setDirection: (direction) => set({ direction }),
  setPlayerTile: (playerTile) => set({ playerTile }),

  collectPellet: (position) =>
    set((state) => {
      if (state.status !== 'playing') return state

      const level = getLevelConfig(state.level)
      const key = tileKey(position)
      if (!state.remainingPellets.has(key)) return state

      const remainingPellets = new Set(state.remainingPellets)
      remainingPellets.delete(key)
      const cell = cellAt(position, level.maze)
      const score = state.score + (cell === 'o' ? 50 : 10)
      const highScore = Math.max(state.highScore, score)
      persistHighScore(highScore)

      const pelletsEaten = state.pelletsEaten + 1
      const totalPellets = state.remainingPellets.size + state.pelletsEaten
      const now = performance.now()
      const spawnTicket = shouldSpawnTicket(
        pelletsEaten,
        totalPellets,
        level.bonus.pelletThreshold,
        state.ticketPhase,
      )
      if (spawnTicket) audio.play('ticketSpawn')

      const completed = remainingPellets.size === 0
      audio.play(completed ? 'levelComplete' : cell === 'o' ? 'power' : 'pellet')

      return {
        remainingPellets,
        pelletsEaten,
        score,
        highScore,
        frightenedUntil:
          cell === 'o'
            ? now + getEffectiveFrightenedDuration(level, state.difficulty)
            : state.frightenedUntil,
        ghostCombo: cell === 'o' ? 0 : state.ghostCombo,
        ticketPhase: spawnTicket ? 'visible' : state.ticketPhase,
        ticketExpiresAt: spawnTicket
          ? getTicketExpiry(now, level.bonus.visibleDurationMs)
          : state.ticketExpiresAt,
        status: completed ? 'level-complete' : state.status,
      }
    }),

  collectTicket: (position) =>
    set((state) => {
      if (state.status !== 'playing') return state
      const level = getLevelConfig(state.level)
      const now = performance.now()

      if (
        !canCollectTicket({
          phase: state.ticketPhase,
          expiresAt: state.ticketExpiresAt,
          now,
          playerTile: position,
          ticketTile: level.bonus.spawnTile,
        })
      ) {
        return isTicketExpired(state.ticketPhase, state.ticketExpiresAt, now)
          ? { ticketPhase: 'expired' }
          : state
      }

      const score = state.score + level.bonus.points
      const highScore = Math.max(state.highScore, score)
      persistHighScore(highScore)
      audio.play('ticketCollect')
      return {
        score,
        highScore,
        ticketPhase: 'collected',
        ticketCollectionId: state.ticketCollectionId + 1,
      }
    }),

  expireTicket: (now = performance.now()) =>
    set((state) =>
      isTicketExpired(state.ticketPhase, state.ticketExpiresAt, now)
        ? { ticketPhase: 'expired' }
        : state,
    ),

  eatGhost: () =>
    set((state) => {
      const points = 200 * 2 ** Math.min(state.ghostCombo, 3)
      const score = state.score + points
      const highScore = Math.max(state.highScore, score)
      persistHighScore(highScore)
      audio.play('ghostEaten')
      return {
        score,
        highScore,
        ghostCombo: state.ghostCombo + 1,
        cameraPunch: state.cameraPunch + 1,
      }
    }),

  playerHit: () =>
    set((state) => {
      if (
        state.status !== 'playing' ||
        performance.now() < state.invulnerableUntil ||
        (DEV_MODE && state.devInvulnerable)
      ) {
        return state
      }
      audio.play('death')
      return {
        status: 'dying',
        lives: Math.max(0, state.lives - 1),
        direction: 'NONE',
        queuedDirection: 'NONE',
        frightenedUntil: 0,
        ghostCombo: 0,
      }
    }),

  finishDeath: () =>
    set((state) => {
      if (state.status !== 'dying') return state
      if (state.lives <= 0) return { status: 'game-over' }

      const level = getLevelConfig(state.level)
      return {
        roundId: state.roundId + 1,
        status: 'playing',
        direction: 'NONE',
        queuedDirection: 'NONE',
        playerTile: getPlayerSpawn(level.maze),
        invulnerableUntil: performance.now() + RESPAWN_GRACE_MS,
      }
    }),

  finishLevelTransition: () =>
    set((state) => {
      if (state.status !== 'level-complete') return state
      if (state.level === FINAL_LEVEL.id) {
        audio.play('gameComplete')
        return { status: 'campaign-complete' }
      }

      const nextLevel = (state.level + 1) as LevelNumber
      const config = getLevelConfig(nextLevel)
      return {
        roundId: state.roundId + 1,
        level: nextLevel,
        status: 'level-ready',
        remainingPellets: getInitialPellets(config.maze),
        pelletsEaten: 0,
        frightenedUntil: 0,
        invulnerableUntil: 0,
        ghostCombo: 0,
        pausedAt: null,
        cameraPunch: 0,
        direction: 'NONE',
        queuedDirection: 'NONE',
        playerTile: getPlayerSpawn(config.maze),
        ticketPhase: 'waiting',
        ticketExpiresAt: 0,
      }
    }),

  beginLevel: () =>
    set((state) =>
      state.status === 'level-ready' ? { status: 'playing' } : state,
    ),

  togglePause: () =>
    set((state) => {
      if (state.status === 'playing') {
        return { status: 'paused', pausedAt: performance.now() }
      }
      if (state.status === 'paused') {
        const pausedFor = state.pausedAt ? performance.now() - state.pausedAt : 0
        return {
          status: 'playing',
          pausedAt: null,
          frightenedUntil:
            state.frightenedUntil > 0 ? state.frightenedUntil + pausedFor : 0,
          invulnerableUntil:
            state.invulnerableUntil > 0 ? state.invulnerableUntil + pausedFor : 0,
          ticketExpiresAt:
            state.ticketPhase === 'visible'
              ? state.ticketExpiresAt + pausedFor
              : state.ticketExpiresAt,
        }
      }
      return state
    }),

  toggleMute: () =>
    set((state) => {
      const muted = !state.muted
      audio.setMuted(muted)
      if (!muted) audio.unlock()
      try {
        localStorage.setItem('geral-muted', String(muted))
      } catch {
        // Muting still works for the current session.
      }
      return { muted }
    }),

  startGame: () => {
    audio.unlock()
    set((state) =>
      state.status === 'ready'
        ? { status: 'playing', lives: getStartingLives(state.difficulty) }
        : state,
    )
  },

  newGame: () => {
    audio.unlock()
    set((state) => ({
      roundId: state.roundId + 1,
      level: DEFAULT_LEVEL.id,
      status: 'playing',
      score: 0,
      lives: getStartingLives(state.difficulty),
      remainingPellets: getInitialPellets(DEFAULT_LEVEL.maze),
      pelletsEaten: 0,
      frightenedUntil: 0,
      invulnerableUntil: 0,
      ghostCombo: 0,
      pausedAt: null,
      cameraPunch: 0,
      direction: 'NONE',
      queuedDirection: 'NONE',
      playerTile: getPlayerSpawn(DEFAULT_LEVEL.maze),
      ticketPhase: 'waiting',
      ticketExpiresAt: 0,
      ticketCollectionId: 0,
    }))
  },

  returnToMenu: () =>
    set((state) => ({
      roundId: state.roundId + 1,
      level: DEFAULT_LEVEL.id,
      status: 'ready',
      score: 0,
      lives: getStartingLives(state.difficulty),
      remainingPellets: getInitialPellets(DEFAULT_LEVEL.maze),
      pelletsEaten: 0,
      frightenedUntil: 0,
      invulnerableUntil: 0,
      ghostCombo: 0,
      pausedAt: null,
      cameraPunch: 0,
      direction: 'NONE',
      queuedDirection: 'NONE',
      playerTile: getPlayerSpawn(DEFAULT_LEVEL.maze),
      ticketPhase: 'waiting',
      ticketExpiresAt: 0,
      ticketCollectionId: 0,
      devInvulnerable: false,
      devDebug: false,
    })),

  resetPlayer: () =>
    set((state) => {
      const level = getLevelConfig(state.level)
      return {
        direction: 'NONE',
        queuedDirection: 'NONE',
        playerTile: getPlayerSpawn(level.maze),
      }
    }),

  devLoadLevel: (level) => {
    if (!DEV_MODE) return
    set((state) => {
      const config = getLevelConfig(level)
      return {
        roundId: state.roundId + 1,
        level,
        status: 'playing',
        remainingPellets: getInitialPellets(config.maze),
        pelletsEaten: 0,
        frightenedUntil: 0,
        invulnerableUntil: 0,
        ghostCombo: 0,
        pausedAt: null,
        cameraPunch: 0,
        direction: 'NONE',
        queuedDirection: 'NONE',
        playerTile: getPlayerSpawn(config.maze),
        ticketPhase: 'waiting',
        ticketExpiresAt: 0,
      }
    })
  },

  devReloadLevel: () => {
    if (!DEV_MODE) return
    set((state) => {
      const config = getLevelConfig(state.level)
      return {
        roundId: state.roundId + 1,
        status: 'playing',
        remainingPellets: getInitialPellets(config.maze),
        pelletsEaten: 0,
        frightenedUntil: 0,
        invulnerableUntil: 0,
        ghostCombo: 0,
        pausedAt: null,
        cameraPunch: 0,
        direction: 'NONE',
        queuedDirection: 'NONE',
        playerTile: getPlayerSpawn(config.maze),
        ticketPhase: 'waiting',
        ticketExpiresAt: 0,
      }
    })
  },

  toggleDevInvulnerable: () => {
    if (!DEV_MODE) return
    set((state) => ({ devInvulnerable: !state.devInvulnerable }))
  },

  toggleDevDebug: () => {
    if (!DEV_MODE) return
    set((state) => ({ devDebug: !state.devDebug }))
  },
}))
