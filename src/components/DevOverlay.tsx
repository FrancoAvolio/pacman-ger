import { useEffect, useState } from 'react'
import { DEV_MODE } from '../game/dev'
import { getDifficultyConfig } from '../game/difficulty'
import { useGameStore } from '../store/gameStore'

export function DevOverlay() {
  const [now, setNow] = useState(0)
  const devDebug = useGameStore((state) => state.devDebug)
  const devInvulnerable = useGameStore((state) => state.devInvulnerable)
  const level = useGameStore((state) => state.level)
  const difficulty = useGameStore((state) => state.difficulty)
  const score = useGameStore((state) => state.score)
  const lives = useGameStore((state) => state.lives)
  const playerTile = useGameStore((state) => state.playerTile)
  const direction = useGameStore((state) => state.direction)
  const remainingPellets = useGameStore((state) => state.remainingPellets.size)
  const frightenedUntil = useGameStore((state) => state.frightenedUntil)
  const ticketPhase = useGameStore((state) => state.ticketPhase)

  useEffect(() => {
    if (!DEV_MODE || !devDebug) return
    const update = () => setNow(performance.now())
    update()
    const interval = window.setInterval(update, 250)
    return () => window.clearInterval(interval)
  }, [devDebug])

  if (!DEV_MODE) return null

  return (
    <>
      {devInvulnerable && (
        <div className="dev-indicator" role="status">
          DEV · INVULNERABLE
        </div>
      )}
      {devDebug && (
        <aside className="dev-debug" aria-label="Información de desarrollo">
          <strong>DEV INFO</strong>
          <span>Level {level} · {getDifficultyConfig(difficulty).label}</span>
          <span>Score {score} · Lives {lives}</span>
          <span>Pac-Man {playerTile.row},{playerTile.col} · {direction}</span>
          <span>Pellets {remainingPellets}</span>
          <span>Frightened {Math.max(0, Math.ceil((frightenedUntil - now) / 1_000))}s</span>
          <span>Ticket {ticketPhase}</span>
        </aside>
      )}
    </>
  )
}
