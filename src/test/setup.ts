import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { audio } from '../game/audio'
import { getInitialPellets, PLAYER_SPAWN } from '../game/maze'
import { useGameStore } from '../store/gameStore'

const initialState = useGameStore.getInitialState()

beforeEach(() => {
  localStorage.clear()
  audio.setMuted(initialState.muted)
  useGameStore.setState(
    {
      ...initialState,
      remainingPellets: getInitialPellets(),
      playerTile: { ...PLAYER_SPAWN },
    },
    true,
  )
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})
