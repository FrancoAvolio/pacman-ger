import { create } from 'zustand'
import { FRIGHTENED_DURATION_MS, RESPAWN_GRACE_MS } from '../game/constants'
import { cellAt, getInitialPellets, PLAYER_SPAWN, tileKey } from '../game/maze'
import type { Direction, GameStatus, GridPosition } from '../game/types'
import { audio } from '../game/audio'

const STARTING_LIVES = 3

function readHighScore(): number {
  try {
    const value = Number.parseInt(localStorage.getItem('geral-high-score') ?? '0', 10)
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

type GameStore = {
  roundId: number
  status: GameStatus
  score: number
  highScore: number
  lives: number
  remainingPellets: Set<string>
  frightenedUntil: number
  invulnerableUntil: number
  ghostCombo: number
  pausedAt: number | null
  cameraPunch: number
  direction: Direction
  queuedDirection: Direction
  playerTile: GridPosition
  queueDirection: (direction: Direction) => void
  setDirection: (direction: Direction) => void
  setPlayerTile: (position: GridPosition) => void
  collectPellet: (position: GridPosition) => void
  eatGhost: () => void
  playerHit: () => void
  finishDeath: () => void
  togglePause: () => void
  startGame: () => void
  newGame: () => void
  resetPlayer: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  roundId: 0,
  status: 'ready',
  score: 0,
  highScore: readHighScore(),
  lives: STARTING_LIVES,
  remainingPellets: getInitialPellets(),
  frightenedUntil: 0,
  invulnerableUntil: 0,
  ghostCombo: 0,
  pausedAt: null,
  cameraPunch: 0,
  direction: 'NONE',
  queuedDirection: 'NONE',
  playerTile: PLAYER_SPAWN,
  queueDirection: (queuedDirection) => set({ queuedDirection }),
  setDirection: (direction) => set({ direction }),
  setPlayerTile: (playerTile) => set({ playerTile }),
  collectPellet: (position) =>
    set((state) => {
      const key = tileKey(position)
      if (!state.remainingPellets.has(key)) return state

      const remainingPellets = new Set(state.remainingPellets)
      remainingPellets.delete(key)
      const score = state.score + (cellAt(position) === 'o' ? 50 : 10)
      const highScore = Math.max(state.highScore, score)
      try {
        localStorage.setItem('geral-high-score', String(highScore))
      } catch {
        // Private browsing policies can deny storage; gameplay should continue.
      }
      const completed = remainingPellets.size === 0
      audio.play(completed ? 'levelComplete' : cellAt(position) === 'o' ? 'power' : 'pellet')

      return {
        remainingPellets,
        score,
        highScore,
        frightenedUntil:
          cellAt(position) === 'o'
            ? performance.now() + FRIGHTENED_DURATION_MS
            : state.frightenedUntil,
        ghostCombo: cellAt(position) === 'o' ? 0 : state.ghostCombo,
        status: completed ? 'level-complete' : state.status,
      }
    }),
  eatGhost: () =>
    set((state) => {
      const points = 200 * 2 ** Math.min(state.ghostCombo, 3)
      const score = state.score + points
      const highScore = Math.max(state.highScore, score)
      try {
        localStorage.setItem('geral-high-score', String(highScore))
      } catch {
        // High score still survives in memory for this session.
      }
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
        performance.now() < state.invulnerableUntil
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
    set((state) =>
      state.lives <= 0
        ? { status: 'game-over' }
        : {
            roundId: state.roundId + 1,
            status: 'playing',
            direction: 'NONE',
            queuedDirection: 'NONE',
            playerTile: PLAYER_SPAWN,
            invulnerableUntil: performance.now() + RESPAWN_GRACE_MS,
          },
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
        }
      }
      return state
    }),
  startGame: () => {
    audio.unlock()
    set((state) => (state.status === 'ready' ? { status: 'playing' } : state))
  },
  newGame: () =>
    set((state) => ({
      roundId: state.roundId + 1,
      status: 'playing',
      score: 0,
      lives: STARTING_LIVES,
      remainingPellets: getInitialPellets(),
      frightenedUntil: 0,
      invulnerableUntil: 0,
      ghostCombo: 0,
      pausedAt: null,
      cameraPunch: 0,
      direction: 'NONE',
      queuedDirection: 'NONE',
      playerTile: PLAYER_SPAWN,
    })),
  resetPlayer: () =>
    set({
      direction: 'NONE',
      queuedDirection: 'NONE',
      playerTile: PLAYER_SPAWN,
    }),
}))
