import { useEffect } from 'react'
import { KEY_DIRECTIONS } from '../game/constants'
import { useGameStore } from '../store/gameStore'

export function useKeyboardControls() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.code === 'Enter' || event.code === 'Space') &&
        useGameStore.getState().status === 'ready'
      ) {
        event.preventDefault()
        useGameStore.getState().startGame()
        return
      }

      if (event.code === 'KeyR') {
        event.preventDefault()
        useGameStore.getState().newGame()
        return
      }

      if (event.code === 'KeyP' || event.code === 'Escape') {
        event.preventDefault()
        useGameStore.getState().togglePause()
        return
      }

      const direction = KEY_DIRECTIONS[event.code]
      if (!direction) return

      event.preventDefault()
      useGameStore.getState().queueDirection(direction)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
