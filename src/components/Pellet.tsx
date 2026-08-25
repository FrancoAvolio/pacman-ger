import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { findCells, gridToWorld, tileKey } from '../game/maze'
import { useGameStore } from '../store/gameStore'

type PelletFieldProps = {
  positions: ReturnType<typeof findCells>
  power?: boolean
}

function PelletField({ positions, power = false }: PelletFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const remainingPellets = useGameStore((state) => state.remainingPellets)

  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4()
    let visibleIndex = 0

    positions.forEach((position) => {
      if (!remainingPellets.has(tileKey(position))) return
      const [x, , z] = gridToWorld(position)
      matrix.makeTranslation(x, power ? 0.31 : 0.22, z)
      meshRef.current?.setMatrixAt(visibleIndex, matrix)
      visibleIndex += 1
    })

    if (meshRef.current) {
      meshRef.current.count = visibleIndex
      meshRef.current.instanceMatrix.needsUpdate = true
      meshRef.current.computeBoundingSphere()
    }
  }, [positions, power, remainingPellets])

  useFrame(({ clock }) => {
    if (!power || !groupRef.current) return
    const scale = 0.88 + Math.sin(clock.elapsedTime * 4.2) * 0.13
    groupRef.current.scale.setScalar(scale)
  })

  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, positions.length]}>
        <sphereGeometry args={[power ? 0.18 : 0.075, power ? 16 : 9, power ? 12 : 7]} />
        <meshStandardMaterial
          color={power ? '#fff3c4' : '#ffe8a8'}
          emissive={power ? '#ffc85a' : '#ffbf69'}
          emissiveIntensity={power ? 3.2 : 2.1}
          roughness={0.35}
        />
      </instancedMesh>
    </group>
  )
}

export function Pellets() {
  const pellets = useMemo(() => findCells('.'), [])
  const powerPellets = useMemo(() => findCells('o'), [])

  return (
    <group>
      <PelletField positions={pellets} />
      <PelletField positions={powerPellets} power />
    </group>
  )
}
