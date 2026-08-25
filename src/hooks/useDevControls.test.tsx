import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEV_MODE } from '../game/dev'
import { getInitialPellets } from '../game/maze'
import { getLevelConfig } from '../game/levels'
import { useGameStore } from '../store/gameStore'
import { useDevControls } from './useDevControls'

function DevHarness() {
  useDevControls()
  return null
}

describe('development controls', () => {
  it('loads a clean requested level and preserves the selected difficulty', () => {
    render(<DevHarness />)
    useGameStore.setState({ status: 'playing', level: 1, difficulty: 'arcade', score: 720, lives: 2 })
    fireEvent.keyDown(window, { code: 'Digit3', shiftKey: true })

    if (!DEV_MODE) {
      expect(useGameStore.getState().level).toBe(1)
      return
    }

    expect(useGameStore.getState()).toMatchObject({
      level: 3,
      status: 'playing',
      difficulty: 'arcade',
      score: 720,
      lives: 2,
    })
    expect(useGameStore.getState().remainingPellets).toEqual(
      getInitialPellets(getLevelConfig(3).maze),
    )
  })

  it('reloads the current level and toggles isolated dev flags', () => {
    render(<DevHarness />)
    useGameStore.setState({ status: 'playing', level: 2, devInvulnerable: false, devDebug: false })
    fireEvent.keyDown(window, { code: 'KeyR', shiftKey: true })
    fireEvent.keyDown(window, { code: 'KeyI', shiftKey: true })
    fireEvent.keyDown(window, { code: 'KeyD', shiftKey: true })

    if (!DEV_MODE) {
      expect(useGameStore.getState()).toMatchObject({
        level: 2,
        devInvulnerable: false,
        devDebug: false,
      })
      return
    }

    expect(useGameStore.getState()).toMatchObject({
      level: 2,
      status: 'playing',
      devInvulnerable: true,
      devDebug: true,
    })
    expect(useGameStore.getState().remainingPellets.size).toBe(
      getInitialPellets(getLevelConfig(2).maze).size,
    )
  })
})
