import { useEffect } from 'react'
import { KEY_DIRECTIONS } from '../game/constants'
import { useGameStore } from '../store/gameStore'

export function useKeyboardControls() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const store = useGameStore.getState()
      if (
        (event.code === 'Enter' || event.code === 'Space') &&
        (store.status === 'ready' || store.status === 'level-ready')
      ) {
        event.preventDefault()
        if (store.status === 'ready') store.startGame()
        else store.beginLevel()
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

      if (event.code === 'KeyM') {
        event.preventDefault()
        useGameStore.getState().toggleMute()
        return
      }

      if (store.status === 'ready' && event.code === 'ArrowLeft') {
        event.preventDefault()
        useGameStore.getState().cycleDifficulty('previous')
        return
      }

      if (store.status === 'ready' && event.code === 'ArrowRight') {
        event.preventDefault()
        useGameStore.getState().cycleDifficulty('next')
        return
      }

      if (store.status === 'ready' && KEY_DIRECTIONS[event.code]) {
        event.preventDefault()
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
