import { Canvas } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { Maze } from './Maze'
import { Pacman } from './Pacman'
import { Pellets } from './Pellet'
import { HUD } from './HUD'
import { Ghost } from './Ghost'
import { CameraRig } from './CameraRig'
import { StartScreen } from './StartScreen'
import { TrainEasterEgg } from './TrainEasterEgg'
import { useKeyboardControls } from '../hooks/useKeyboardControls'

function GameScene() {
  return (
    <>
      <color attach="background" args={['#03050d']} />
      <fog attach="fog" args={['#03050d', 17, 28]} />
      <ambientLight intensity={0.72} color="#5976bb" />
      <directionalLight
        castShadow
        position={[-4, 12, 5]}
        intensity={2.2}
        color="#dbe8ff"
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[0, 4, 0]} intensity={18} color="#1e5fff" distance={18} />
      <CameraRig />
      <Maze />
      <Pellets />
      <Pacman />
      <Ghost id="red" personality="RED" spawnIndex={0} />
      <Ghost id="pink" personality="PINK" spawnIndex={1} />
      <Ghost id="cyan" personality="CYAN" spawnIndex={2} />
      <Ghost id="orange" personality="ORANGE" spawnIndex={3} />
      <TrainEasterEgg />
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.24}
        scale={24}
        blur={2.2}
        far={4}
        resolution={512}
        frames={1}
      />
    </>
  )
}

export function Game() {
  useKeyboardControls()

  return (
    <main className="game-shell">
      <div className="prototype-badge">
        <span>FLECHAS / WASD</span>
        P para pausar
      </div>
      <HUD />
      <StartScreen />
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 16.5, 14.5], fov: 55, near: 0.1, far: 80 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <GameScene />
      </Canvas>
    </main>
  )
}
