import { useEffect } from 'react'
import { getDifficultyConfig } from '../game/difficulty'
import { useGameStore } from '../store/gameStore'

const LEVEL_TRANSITION_MS = 1_450

function formatScore(value: number): string {
  return value.toString().padStart(6, '0')
}

export function HUD() {
  const score = useGameStore((state) => state.score)
  const highScore = useGameStore((state) => state.highScore)
  const lives = useGameStore((state) => state.lives)
  const level = useGameStore((state) => state.level)
  const difficulty = useGameStore((state) => state.difficulty)
  const status = useGameStore((state) => state.status)
  const muted = useGameStore((state) => state.muted)
  const ticketPhase = useGameStore((state) => state.ticketPhase)
  const ticketCollectionId = useGameStore((state) => state.ticketCollectionId)
  const newGame = useGameStore((state) => state.newGame)
  const returnToMenu = useGameStore((state) => state.returnToMenu)
  const beginLevel = useGameStore((state) => state.beginLevel)
  const togglePause = useGameStore((state) => state.togglePause)
  const toggleMute = useGameStore((state) => state.toggleMute)

  useEffect(() => {
    if (status !== 'level-complete') return
    const timeout = window.setTimeout(() => {
      useGameStore.getState().finishLevelTransition()
    }, LEVEL_TRANSITION_MS)
    return () => window.clearTimeout(timeout)
  }, [status])

  return (
    <div className="hud-layer">
      <header className="hud" aria-label="Estado de la partida">
        <div className="hud-stat">
          <span>Score</span>
          <strong>{formatScore(score)}</strong>
        </div>
        <div className="hud-stat hud-stat--high">
          <span>High score</span>
          <strong>{formatScore(highScore)}</strong>
        </div>
        <div className="hud-level" aria-label={`Nivel ${level}`}>
          <span>Level {level}</span>
          <small>· {getDifficultyConfig(difficulty).label}</small>
        </div>
        <div className="hud-stat hud-stat--lives">
          <span>Lives</span>
          <div className="life-row" aria-label={`${lives} vidas`}>
            {Array.from({ length: lives }, (_, index) => (
              <i key={index} />
            ))}
          </div>
        </div>
      </header>

      <button
        type="button"
        className="audio-toggle"
        aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
        aria-pressed={muted}
        onClick={toggleMute}
      >
        {muted ? 'SONIDO —' : 'SONIDO ♪'}
      </button>

      {ticketPhase === 'collected' && (
        <div key={ticketCollectionId} className="bonus-toast" role="status">
          +1000 · TICKET
        </div>
      )}

      {status === 'paused' && (
        <section className="game-overlay">
          <p>Intermisión</p>
          <h1>PAUSA</h1>
          <div className="game-overlay__actions">
            <button type="button" onClick={togglePause}>
              Continuar
            </button>
            <button type="button" className="button-secondary" onClick={newGame}>
              Reiniciar
            </button>
            <button type="button" className="button-secondary" onClick={returnToMenu}>
              Volver al menú
            </button>
          </div>
        </section>
      )}

      {status === 'level-complete' && (
        <section className="game-overlay game-overlay--complete">
          <p>Level {level}</p>
          <h1>COMPLETO</h1>
          <strong>{formatScore(score)} puntos</strong>
        </section>
      )}

      {status === 'level-ready' && (
        <section className="game-overlay game-overlay--ready">
          <p>Level {level}</p>
          <h1>READY, GERAL?</h1>
          <button type="button" onClick={beginLevel}>
            Continuar
          </button>
        </section>
      )}

      {status === 'campaign-complete' && (
        <section className="game-overlay game-overlay--campaign">
          <h1>GERAL WINS ♡</h1>
          <p className="game-overlay__message">Gracias por jugar.</p>
          <strong>{formatScore(score)} puntos</strong>
          <button type="button" onClick={newGame}>
            Nueva partida
          </button>
        </section>
      )}

      {status === 'game-over' && (
        <section className="game-overlay game-overlay--danger">
          <p>Fin de la partida</p>
          <h1>TE CAISTE GERAL</h1>
          <strong>{formatScore(score)} puntos</strong>
          <button type="button" onClick={newGame}>
            Intentar de nuevo
          </button>
        </section>
      )}
    </div>
  )
}
