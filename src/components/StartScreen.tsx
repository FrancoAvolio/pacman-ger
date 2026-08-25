import { useGameStore } from '../store/gameStore'

export function StartScreen() {
  const status = useGameStore((state) => state.status)
  const startGame = useGameStore((state) => state.startGame)

  if (status !== 'ready') return null

  return (
    <section className="start-screen">
      <div className="start-screen__glow" />
      <p className="start-screen__eyebrow">Insertá un poquito de coraje</p>
      <h1>READY, <span>GERAL?</span></h1>
      <p className="start-screen__subtitle">Una partida para vos.</p>
      <button type="button" onClick={startGame}>Empezar partida</button>
      <div className="start-screen__controls">
        <span className="desktop-control-hint">Flechas / WASD</span>
        <span className="mobile-control-hint">Deslizá para moverte</span>
        <i />
        <span>P / Esc pausa</span>
      </div>
    </section>
  )
}
