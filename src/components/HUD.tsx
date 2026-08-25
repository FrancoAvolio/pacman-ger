import { useGameStore } from "../store/gameStore";

function formatScore(value: number): string {
  return value.toString().padStart(6, "0");
}

export function HUD() {
  const score = useGameStore((state) => state.score);
  const highScore = useGameStore((state) => state.highScore);
  const lives = useGameStore((state) => state.lives);
  const status = useGameStore((state) => state.status);
  const newGame = useGameStore((state) => state.newGame);
  const togglePause = useGameStore((state) => state.togglePause);

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
        <div className="hud-stat hud-stat--lives">
          <span>Lives</span>
          <div className="life-row" aria-label={`${lives} vidas`}>
            {Array.from({ length: lives }, (_, index) => (
              <i key={index} />
            ))}
          </div>
        </div>
      </header>

      {status === "paused" && (
        <section className="game-overlay">
          <p>INTERMISIÓN</p>
          <h1>PAUSA</h1>
          <div className="game-overlay__actions">
            <button type="button" onClick={togglePause}>
              Continuar
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={newGame}
            >
              Reiniciar
            </button>
          </div>
        </section>
      )}

      {status === "level-complete" && (
        <section className="game-overlay game-overlay--complete">
          <p>Para Geraldine ♡</p>
          <strong>{formatScore(score)} puntos</strong>
          <button type="button" onClick={newGame}>
            Jugar otra vez
          </button>
        </section>
      )}

      {status === "game-over" && (
        <section className="game-overlay game-overlay--danger">
          <p>Fin de la partida</p>
          <h1>GAME OVER</h1>
          <strong>{formatScore(score)} puntos</strong>
          <button type="button" onClick={newGame}>
            Intentar de nuevo
          </button>
        </section>
      )}
    </div>
  );
}
