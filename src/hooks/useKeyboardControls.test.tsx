import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { audio } from '../game/audio'
import { useGameStore } from '../store/gameStore'
import { useKeyboardControls } from './useKeyboardControls'

function KeyboardHarness() {
  useKeyboardControls()
  return null
}

describe('keyboard controls', () => {
  it('starts with Enter and queues arrow/WASD movement', () => {
    vi.spyOn(audio, 'unlock').mockImplementation(() => undefined)
    render(<KeyboardHarness />)
    useGameStore.setState({ status: 'ready' })
    fireEvent.keyDown(window, { code: 'Enter' })
    expect(useGameStore.getState().status).toBe('playing')

    fireEvent.keyDown(window, { code: 'ArrowUp' })
    expect(useGameStore.getState().queuedDirection).toBe('UP')
    fireEvent.keyDown(window, { code: 'KeyD' })
    expect(useGameStore.getState().queuedDirection).toBe('RIGHT')
  })

  it('continues a prepared level with Space', () => {
    render(<KeyboardHarness />)
    useGameStore.setState({ status: 'level-ready', level: 2 })
    fireEvent.keyDown(window, { code: 'Space' })
    expect(useGameStore.getState()).toMatchObject({ status: 'playing', level: 2 })
  })

  it('pauses, resumes and restarts', () => {
    render(<KeyboardHarness />)
    useGameStore.setState({ status: 'playing', score: 300, lives: 1 })
    fireEvent.keyDown(window, { code: 'KeyP' })
    expect(useGameStore.getState().status).toBe('paused')
    fireEvent.keyDown(window, { code: 'Escape' })
    expect(useGameStore.getState().status).toBe('playing')
    fireEvent.keyDown(window, { code: 'KeyR' })
    expect(useGameStore.getState()).toMatchObject({ status: 'playing', score: 0, lives: 3 })
  })

  it('toggles audio with M', () => {
    render(<KeyboardHarness />)
    useGameStore.setState({ muted: false })
    fireEvent.keyDown(window, { code: 'KeyM' })
    expect(useGameStore.getState().muted).toBe(true)
    fireEvent.keyDown(window, { code: 'KeyM' })
    expect(useGameStore.getState().muted).toBe(false)
  })

  it('removes its listener when unmounted', () => {
    const view = render(<KeyboardHarness />)
    view.unmount()
    fireEvent.keyDown(window, { code: 'ArrowLeft' })
    expect(useGameStore.getState().queuedDirection).toBe('NONE')
  })
})
