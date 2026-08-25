import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { LevelConfig } from '../game/levels'
import { findCells, gridToActorWorld, tileKey } from '../game/maze'
import { useGameStore } from '../store/gameStore'

type PelletFieldProps = {
  positions: ReturnType<typeof findCells>
  level: LevelConfig
  power?: boolean
}

function PelletField({ positions, level, power = false }: PelletFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const remainingPellets = useGameStore((state) => state.remainingPellets)

  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4()
    let visibleIndex = 0

    positions.forEach((position) => {
      if (!remainingPellets.has(tileKey(position))) return
      const [x, , z] = gridToActorWorld(position, level)
      matrix.makeTranslation(x, power ? 0.3 : 0.21, z)
      meshRef.current?.setMatrixAt(visibleIndex, matrix)
      visibleIndex += 1
    })

    if (meshRef.current) {
      meshRef.current.count = visibleIndex
      meshRef.current.instanceMatrix.needsUpdate = true
      meshRef.current.computeBoundingSphere()
    }
  }, [level, positions, power, remainingPellets])

  useFrame(({ clock }) => {
    if (!power || !groupRef.current) return
    const scale = 0.88 + Math.sin(clock.elapsedTime * 4.2) * 0.13
    groupRef.current.scale.setScalar(scale)
  })

  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, positions.length]}>
        <sphereGeometry args={[power ? 0.165 : 0.066, power ? 16 : 9, power ? 12 : 7]} />
        <meshStandardMaterial
          color={power ? '#fff3c4' : '#ffe8a8'}
          emissive={power ? '#ffc85a' : '#ffbf69'}
          emissiveIntensity={power ? 2.8 : 1.72}
          roughness={0.35}
        />
      </instancedMesh>
    </group>
  )
}

type PelletsProps = {
  level: LevelConfig
}

export function Pellets({ level }: PelletsProps) {
  const pellets = useMemo(() => findCells('.', level), [level])
  const powerPellets = useMemo(() => findCells('o', level), [level])

  return (
    <group>
      <PelletField positions={pellets} level={level} />
      <PelletField positions={powerPellets} level={level} power />
    </group>
  )
}
