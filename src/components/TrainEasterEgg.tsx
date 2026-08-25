import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { MAZE_LAYOUT } from '../game/maze'

type TrainEasterEggProps = {
  layout?: readonly string[]
}

const TRAIN_Y = 0.22
const TRACK_TIES = [-0.76, -0.5, -0.25, 0, 0.25, 0.5, 0.76]
const WHEEL_POSITIONS = [-0.35, 0.35].flatMap((x) =>
  [-0.28, 0.28].map((z) => ({ x, z })),
)

function trainPositionFor(layout: readonly string[]): [number, number] {
  const rows = Math.max(1, layout.length)
  const columns = Math.max(1, layout[0]?.length ?? 1)
  const halfWidth = (columns - 1) / 2
  const halfDepth = (rows - 1) / 2

  // It stays outside the playable graph, but the platform makes that placement
  // intentional and keeps every decorative mesh clear of the border wall.
  return [halfWidth + 1.75, halfDepth * 0.68]
}

export function TrainEasterEgg({ layout = MAZE_LAYOUT }: TrainEasterEggProps) {
  const trainRef = useRef<THREE.Group>(null)
  const wheelRefs = useRef<Array<THREE.Mesh | null>>([])
  const [baseX, baseZ] = useMemo(() => trainPositionFor(layout), [layout])

  useFrame(({ clock }, delta) => {
    const train = trainRef.current
    if (!train) return

    train.position.x = baseX + Math.sin(clock.elapsedTime * 0.38) * 0.1
    train.position.y = TRAIN_Y + Math.sin(clock.elapsedTime * 0.9) * 0.014
    train.position.z = baseZ + Math.sin(clock.elapsedTime * 0.32) * 0.045

    const wheelStep = Math.min(delta, 0.05) * 1.1
    wheelRefs.current.forEach((wheel) => wheel?.rotateY(wheelStep))
  })

  return (
    <group>
      <group position={[baseX, 0, baseZ]}>
        <mesh position-y={0.035} receiveShadow>
          <boxGeometry args={[1.95, 0.07, 0.78]} />
          <meshStandardMaterial
            color="#071020"
            emissive="#071739"
            emissiveIntensity={0.42}
            roughness={0.68}
          />
        </mesh>
        {TRACK_TIES.map((x) => (
          <mesh key={x} position={[x, 0.08, 0]} receiveShadow>
            <boxGeometry args={[0.075, 0.035, 0.62]} />
            <meshStandardMaterial color="#4b2f20" roughness={0.82} />
          </mesh>
        ))}
        {[-0.22, 0.22].map((z) => (
          <mesh key={z} position={[0, 0.105, z]}>
            <boxGeometry args={[1.78, 0.045, 0.055]} />
            <meshStandardMaterial color="#8798b5" metalness={0.78} roughness={0.28} />
          </mesh>
        ))}
      </group>

      <group
        ref={trainRef}
        position={[baseX, TRAIN_Y, baseZ]}
        rotation={[0, 0, 0]}
        scale={0.5}
        aria-label="Un tren diminuto escondido"
      >
        <mesh position={[0, 0.12, 0]} castShadow>
          <boxGeometry args={[1.15, 0.38, 0.48]} />
          <meshStandardMaterial color="#d9485f" emissive="#6e101f" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[-0.36, 0.46, 0]} castShadow>
          <boxGeometry args={[0.42, 0.45, 0.46]} />
          <meshStandardMaterial color="#f2b632" emissive="#864b00" emissiveIntensity={0.28} />
        </mesh>
        <mesh position={[0.22, 0.36, 0]} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.62, 14]} />
          <meshStandardMaterial color="#e85a64" roughness={0.35} />
        </mesh>
        <mesh position={[0.48, 0.68, 0]}>
          <cylinderGeometry args={[0.09, 0.13, 0.35, 12]} />
          <meshStandardMaterial color="#283451" metalness={0.35} />
        </mesh>
        {WHEEL_POSITIONS.map(({ x, z }, index) => (
          <group key={`${x}:${z}`} position={[x, -0.12, z]} rotation-x={Math.PI / 2}>
            <mesh
              ref={(wheel) => {
                wheelRefs.current[index] = wheel
              }}
            >
              <cylinderGeometry args={[0.18, 0.18, 0.08, 14]} />
              <meshStandardMaterial color="#172038" metalness={0.6} roughness={0.3} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}
