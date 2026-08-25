import { gridToWorld } from '../game/maze'

export function TrainEasterEgg() {
  const [x, , z] = gridToWorld({ row: 20, col: 19 })

  return (
    <group
      position={[x, 0.82, z]}
      rotation={[0, -Math.PI / 5, 0]}
      scale={0.24}
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
      {[-0.35, 0.35].flatMap((wheelX) =>
        [-0.28, 0.28].map((wheelZ) => (
          <mesh key={`${wheelX}:${wheelZ}`} position={[wheelX, -0.12, wheelZ]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.18, 0.18, 0.08, 14]} />
            <meshStandardMaterial color="#172038" metalness={0.6} roughness={0.3} />
          </mesh>
        )),
      )}
    </group>
  )
}
