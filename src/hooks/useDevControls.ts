import { useEffect } from 'react'
import { DEV_MODE } from '../game/dev'
import type { LevelNumber } from '../game/levels'
import { useGameStore } from '../store/gameStore'

const LEVEL_SHORTCUTS: Readonly<Record<string, LevelNumber>> = {
  Digit1: 1,
  Digit2: 2,
  Digit3: 3,
}

export function useDevControls() {
  useEffect(() => {
    if (!DEV_MODE) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.shiftKey || event.repeat) return

      const store = useGameStore.getState()
      const level = LEVEL_SHORTCUTS[event.code]
      if (level !== undefined) {
        event.preventDefault()
        event.stopImmediatePropagation()
        store.devLoadLevel(level)
        return
      }

      if (event.code === 'KeyR') {
        event.preventDefault()
        event.stopImmediatePropagation()
        store.devReloadLevel()
        return
      }

      if (event.code === 'KeyI') {
        event.preventDefault()
        event.stopImmediatePropagation()
        store.toggleDevInvulnerable()
        return
      }

      if (event.code === 'KeyD') {
        event.preventDefault()
        event.stopImmediatePropagation()
        store.toggleDevDebug()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
