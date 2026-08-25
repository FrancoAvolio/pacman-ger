import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { PLAYER_SPEED } from '../game/constants'
import { gridToWorld, PLAYER_SPAWN } from '../game/maze'
import { canMove, nextTile } from '../game/movement'
import type { Direction, GridPosition } from '../game/types'
import { useGameStore } from '../store/gameStore'
import { playerWorldPosition } from '../game/runtime'

const DIRECTION_YAW: Record<Exclude<Direction, 'NONE'>, number> = {
  RIGHT: 0,
  DOWN: -Math.PI / 2,
  LEFT: Math.PI,
  UP: Math.PI / 2,
}

export function Pacman() {
  const roundId = useGameStore((state) => state.roundId)
  const characterRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group>(null)
  const mouthRef = useRef<THREE.Mesh>(null)
  const currentTile = useRef<GridPosition>({ ...PLAYER_SPAWN })
  const targetTile = useRef<GridPosition>({ ...PLAYER_SPAWN })
  const direction = useRef<Direction>('NONE')
  const progress = useRef(0)
  const elapsed = useRef(0)
  const deathProgress = useRef(0)
  const deathFinished = useRef(false)

  useLayoutEffect(() => {
    const [x, y, z] = gridToWorld(PLAYER_SPAWN)
    characterRef.current?.position.set(x, y + 0.4, z)
    currentTile.current = { ...PLAYER_SPAWN }
    targetTile.current = { ...PLAYER_SPAWN }
    direction.current = 'NONE'
    progress.current = 0
    elapsed.current = 0
    deathProgress.current = 0
    deathFinished.current = false
    if (modelRef.current) {
      modelRef.current.rotation.z = 0
      modelRef.current.scale.setScalar(1)
      modelRef.current.visible = true
    }
    playerWorldPosition.set(x, y + 0.4, z)
  }, [roundId])

  useFrame((_, delta) => {
    const character = characterRef.current
    if (!character) return

    const frameDelta = Math.min(delta, 0.05)
    const store = useGameStore.getState()

    if (store.status === 'dying') {
      deathProgress.current += frameDelta
      const progress = Math.min(1, deathProgress.current / 1.25)
      if (modelRef.current) {
        modelRef.current.rotation.z = progress * Math.PI * 2.4
        const scale = Math.max(0.02, 1 - progress ** 1.7)
        modelRef.current.scale.set(scale * (1 + progress * 0.4), scale, scale)
      }
      if (progress >= 1 && !deathFinished.current) {
        deathFinished.current = true
        store.finishDeath()
      }
      return
    }

    if (store.status !== 'playing') return

    if (modelRef.current) {
      const protectedFromHit = performance.now() < store.invulnerableUntil
      modelRef.current.visible =
        !protectedFromHit || Math.floor(performance.now() / 110) % 2 === 0
    }

    if (progress.current === 0) {
      const queued = store.queuedDirection
      const nextDirection = canMove(currentTile.current, queued)
        ? queued
        : canMove(currentTile.current, direction.current)
          ? direction.current
          : 'NONE'

      direction.current = nextDirection
      store.setDirection(nextDirection)

      if (nextDirection !== 'NONE') {
        targetTile.current = nextTile(currentTile.current, nextDirection)
      }
    }

    if (direction.current !== 'NONE') {
      progress.current = Math.min(1, progress.current + PLAYER_SPEED * frameDelta)

      const from = gridToWorld(currentTile.current)
      const to = gridToWorld(targetTile.current)
      character.position.x = THREE.MathUtils.lerp(from[0], to[0], progress.current)
      character.position.z = THREE.MathUtils.lerp(from[2], to[2], progress.current)

      if (modelRef.current) {
        modelRef.current.rotation.y = DIRECTION_YAW[direction.current]
      }

      if (progress.current >= 1) {
        currentTile.current = { ...targetTile.current }
        progress.current = 0
        store.setPlayerTile(currentTile.current)
        store.collectPellet(currentTile.current)
      }
    }

    playerWorldPosition.copy(character.position)

    elapsed.current += frameDelta
    const moving = direction.current !== 'NONE'
    const pulse = moving ? Math.abs(Math.sin(elapsed.current * 11)) : 0.28
    if (mouthRef.current) {
      mouthRef.current.scale.x = 0.34 + pulse * 0.66
      mouthRef.current.scale.z = 0.34 + pulse * 0.66
    }
    if (modelRef.current) {
      const bob = moving ? Math.sin(elapsed.current * 10) * 0.025 : 0
      modelRef.current.position.y = bob
      modelRef.current.scale.y = 1 - Math.abs(bob) * 1.5
    }
  })

  return (
    <group ref={characterRef}>
      <group ref={modelRef}>
        <mesh castShadow>
          <sphereGeometry args={[0.36, 32, 24]} />
          <meshStandardMaterial
            color="#ffd91a"
            emissive="#d78e00"
            emissiveIntensity={0.38}
            roughness={0.3}
          />
        </mesh>
        <mesh
          ref={mouthRef}
          position={[0.33, 0, 0]}
          rotation={[0, 0, -Math.PI / 2]}
          scale={[0.7, 1, 0.7]}
        >
          <coneGeometry args={[0.27, 0.72, 4, 1, false, Math.PI / 4]} />
          <meshBasicMaterial color="#030610" />
        </mesh>
        <mesh position={[0.08, 0.27, -0.24]}>
          <sphereGeometry args={[0.045, 12, 8]} />
          <meshBasicMaterial color="#18203a" />
        </mesh>
      </group>
    </group>
  )
}
