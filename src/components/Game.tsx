import { Canvas } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { useRef } from 'react'
import { Maze } from './Maze'
import { Pacman } from './Pacman'
import { Pellets } from './Pellet'
import { HUD } from './HUD'
import { Ghost } from './Ghost'
import { CameraRig } from './CameraRig'
import { StartScreen } from './StartScreen'
import { TrainEasterEgg } from './TrainEasterEgg'
import { BonusTicket } from './BonusTicket'
import { getLevelConfig, type LevelConfig } from '../game/levels'
import { useKeyboardControls } from '../hooks/useKeyboardControls'
import { useDevControls } from '../hooks/useDevControls'
import { useSwipeControls } from '../hooks/useSwipeControls'
import { useGameStore } from '../store/gameStore'
import { DevOverlay } from './DevOverlay'

function GameScene({ level }: { level: LevelConfig }) {
  return (
    <>
      <color attach="background" args={['#03050d']} />
      <fog attach="fog" args={['#03050d', 34, 58]} />
      <ambientLight intensity={0.9} color="#6986cf" />
      <directionalLight
        castShadow
        position={[-4, 12, 5]}
        intensity={2.2}
        color="#dbe8ff"
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[0, 4, 0]} intensity={18} color="#1e5fff" distance={18} />
      <CameraRig />
      <group key={level.id}>
        <Maze level={level} />
        <Pellets level={level} />
        <BonusTicket level={level} />
        <Pacman level={level} />
        <Ghost id="red" personality="RED" spawnIndex={0} level={level} />
        <Ghost id="pink" personality="PINK" spawnIndex={1} level={level} />
        <Ghost id="cyan" personality="CYAN" spawnIndex={2} level={level} />
        <Ghost id="orange" personality="ORANGE" spawnIndex={3} level={level} />
        <TrainEasterEgg layout={level.maze} />
        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.24}
          scale={24}
          blur={2.2}
          far={4}
          resolution={512}
          frames={1}
        />
      </group>
    </>
  )
}

export function Game() {
  useDevControls()
  useKeyboardControls()
  const inputSurfaceRef = useRef<HTMLDivElement>(null)
  const levelNumber = useGameStore((state) => state.level)
  const level = getLevelConfig(levelNumber)
  useSwipeControls(inputSurfaceRef)

  return (
    <main className="game-shell">
      <div className="prototype-badge">
        <span className="desktop-control-hint">FLECHAS / WASD</span>
        <span className="mobile-control-hint">DESLIZÁ PARA MOVER</span>
        <small>P para pausar</small>
      </div>
      <HUD />
      <DevOverlay />
      <StartScreen />
      <div ref={inputSurfaceRef} className="game-input-surface">
        <Canvas
          shadows
          dpr={[1, 1.75]}
          camera={{ position: [0, 16.5, 14.5], fov: 55, near: 0.1, far: 120 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <GameScene level={level} />
        </Canvas>
      </div>
    </main>
  )
}
