import { useGameStore } from '../store/gameStore'
import {
  DIFFICULTY_CONFIG,
  DIFFICULTY_ORDER,
  getDifficultyConfig,
} from '../game/difficulty'

export function StartScreen() {
  const status = useGameStore((state) => state.status)
  const difficulty = useGameStore((state) => state.difficulty)
  const setDifficulty = useGameStore((state) => state.setDifficulty)
  const startGame = useGameStore((state) => state.startGame)

  if (status !== 'ready') return null

  return (
    <section className="start-screen">
      <div className="start-screen__glow" />
      <p className="start-screen__eyebrow">Insertá un poquito de coraje</p>
      <h1>READY, <span>GERAL?</span></h1>
      <p className="start-screen__subtitle">Una partida para vos.</p>
      <div className="difficulty-selector" aria-label="Elegí tu sufrimiento">
        <h2>ELEGÍ TU SUFRIMIENTO</h2>
        <div className="difficulty-selector__options" role="group">
          {DIFFICULTY_ORDER.map((option) => {
            const config = DIFFICULTY_CONFIG[option]
            const selected = option === difficulty
            return (
              <button
                key={option}
                type="button"
                className={`difficulty-option${selected ? ' difficulty-option--selected' : ''}`}
                aria-pressed={selected}
                onClick={() => setDifficulty(option)}
              >
                {config.label}
              </button>
            )
          })}
        </div>
        <p className="difficulty-selector__description">
          {getDifficultyConfig(difficulty).description}
        </p>
      </div>
      <button className="start-screen__start-button" type="button" onClick={startGame}>
        Empezar partida
      </button>
      <div className="start-screen__controls">
        <span className="desktop-control-hint">Flechas / WASD</span>
        <span className="mobile-control-hint">Deslizá para moverte</span>
        <i />
        <span>P / Esc pausa</span>
      </div>
    </section>
  )
}
