import { useLayoutEffect, useMemo, useRef } from 'react'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import * as THREE from 'three'
import { MAZE_LAYOUT, gridToWorld } from '../game/maze'
import { WALL_HEIGHT } from '../game/constants'

export function Maze() {
  const wallPositions = useMemo(
    () =>
      MAZE_LAYOUT.flatMap((row, rowIndex) =>
        Array.from(row).flatMap((cell, colIndex) =>
          cell === '#'
            ? [gridToWorld({ row: rowIndex, col: colIndex })]
            : [],
        ),
      ),
    [],
  )

  const wallsRef = useRef<THREE.InstancedMesh>(null)
  const accentsRef = useRef<THREE.InstancedMesh>(null)
  const wallGeometry = useMemo(
    () => new RoundedBoxGeometry(0.9, WALL_HEIGHT, 0.9, 3, 0.1),
    [],
  )

  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4()

    wallPositions.forEach(([x, , z], index) => {
      matrix.makeTranslation(x, WALL_HEIGHT / 2, z)
      wallsRef.current?.setMatrixAt(index, matrix)
      matrix.compose(
        new THREE.Vector3(x, WALL_HEIGHT + 0.012, z),
        new THREE.Quaternion(),
        new THREE.Vector3(0.76, 1, 0.76),
      )
      accentsRef.current?.setMatrixAt(index, matrix)
    })

    if (wallsRef.current) wallsRef.current.instanceMatrix.needsUpdate = true
    if (accentsRef.current) accentsRef.current.instanceMatrix.needsUpdate = true
  }, [wallPositions])

  return (
    <group>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position-y={-0.035}>
        <planeGeometry args={[21.8, 21.8]} />
        <meshStandardMaterial color="#030610" roughness={0.76} metalness={0.08} />
      </mesh>

      <instancedMesh
        ref={wallsRef}
        args={[wallGeometry, undefined, wallPositions.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#08132d"
          emissive="#041a58"
          emissiveIntensity={0.8}
          roughness={0.32}
          metalness={0.3}
        />
      </instancedMesh>

      <instancedMesh ref={accentsRef} args={[undefined, undefined, wallPositions.length]}>
        <boxGeometry args={[0.9, 0.028, 0.9]} />
        <meshStandardMaterial
          color="#1761d2"
          emissive="#0b45c7"
          emissiveIntensity={2.2}
          roughness={0.4}
        />
      </instancedMesh>
    </group>
  )
}
