import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { PLAYER_SPEED } from '../game/constants'
import type { LevelConfig } from '../game/levels'
import { getPlayerSpawn, gridToActorWorld } from '../game/maze'
import {
  canMove,
  interpolateMove,
  resolveMove,
  type ResolvedMove,
} from '../game/movement'
import { playerWorldPosition } from '../game/runtime'
import type { Direction, GridPosition } from '../game/types'
import { useGameStore } from '../store/gameStore'

const DIRECTION_YAW: Record<Exclude<Direction, 'NONE'>, number> = {
  RIGHT: 0,
  DOWN: -Math.PI / 2,
  LEFT: Math.PI,
  UP: Math.PI / 2,
}

type PacmanModelProps = {
  modelRef: RefObject<THREE.Group | null>
  mouthRef: RefObject<THREE.Mesh | null>
}

function PacmanModel({ modelRef, mouthRef }: PacmanModelProps) {
  return (
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
  )
}

type PacmanProps = {
  level: LevelConfig
}

export function Pacman({ level }: PacmanProps) {
  const roundId = useGameStore((state) => state.roundId)
  const spawn = useMemo(() => getPlayerSpawn(level), [level])
  const characterRef = useRef<THREE.Group>(null)
  const wrappedCharacterRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group>(null)
  const wrappedModelRef = useRef<THREE.Group>(null)
  const mouthRef = useRef<THREE.Mesh>(null)
  const wrappedMouthRef = useRef<THREE.Mesh>(null)
  const currentTile = useRef<GridPosition>({ ...spawn })
  const activeMove = useRef<ResolvedMove | null>(null)
  const direction = useRef<Direction>('NONE')
  const progress = useRef(0)
  const activeRoundId = useRef(roundId)
  const elapsed = useRef(0)
  const deathProgress = useRef(0)
  const deathFinished = useRef(false)

  useLayoutEffect(() => {
    const [x, y, z] = gridToActorWorld(spawn, level)
    characterRef.current?.position.set(x, y + 0.4, z)
    wrappedCharacterRef.current?.position.set(x, y + 0.4, z)
    if (wrappedCharacterRef.current) wrappedCharacterRef.current.visible = false
    currentTile.current = { ...spawn }
    activeMove.current = null
    direction.current = 'NONE'
    progress.current = 0
    activeRoundId.current = roundId
    elapsed.current = 0
    deathProgress.current = 0
    deathFinished.current = false
    for (const model of [modelRef.current, wrappedModelRef.current]) {
      if (!model) continue
      model.rotation.set(0, 0, 0)
      model.position.set(0, 0, 0)
      model.scale.setScalar(1)
      model.visible = true
    }
    playerWorldPosition.set(x, y + 0.4, z)
  }, [level, roundId, spawn])

  useFrame((_, delta) => {
    const character = characterRef.current
    const wrappedCharacter = wrappedCharacterRef.current
    if (!character || !wrappedCharacter) return

    const frameDelta = Math.min(delta, 0.05)
    const store = useGameStore.getState()
    if (store.roundId !== activeRoundId.current) return

    if (store.status === 'dying') {
      if (wrappedCharacter.visible) {
        character.position.copy(wrappedCharacter.position)
      }
      wrappedCharacter.visible = false
      deathProgress.current += frameDelta
      const dyingProgress = Math.min(1, deathProgress.current / 1.25)
      if (modelRef.current) {
        modelRef.current.rotation.z = dyingProgress * Math.PI * 2.4
        const scale = Math.max(0.02, 1 - dyingProgress ** 1.7)
        modelRef.current.scale.set(
          scale * (1 + dyingProgress * 0.4),
          scale,
          scale,
        )
      }
      if (dyingProgress >= 1 && !deathFinished.current) {
        deathFinished.current = true
        store.finishDeath()
      }
      return
    }

    if (store.status !== 'playing') return

    const protectedFromHit = performance.now() < store.invulnerableUntil
    const modelVisible =
      !protectedFromHit || Math.floor(performance.now() / 110) % 2 === 0
    if (modelRef.current) modelRef.current.visible = modelVisible
    if (wrappedModelRef.current) wrappedModelRef.current.visible = modelVisible

    if (progress.current === 0) {
      const queued = store.queuedDirection
      const nextDirection = canMove(currentTile.current, queued, level)
        ? queued
        : canMove(currentTile.current, direction.current, level)
          ? direction.current
          : 'NONE'

      direction.current = nextDirection
      store.setDirection(nextDirection)
      activeMove.current =
        nextDirection === 'NONE'
          ? null
          : resolveMove(currentTile.current, nextDirection, level)
    }

    const move = activeMove.current
    if (direction.current !== 'NONE' && move) {
      progress.current = Math.min(
        1,
        progress.current + PLAYER_SPEED * level.pacmanSpeedMultiplier * frameDelta,
      )

      const interpolated = interpolateMove(move, progress.current, level)
      character.position.set(
        interpolated.position[0],
        interpolated.position[1] + 0.4,
        interpolated.position[2],
      )
      if (interpolated.wrappedPosition) {
        wrappedCharacter.visible = true
        wrappedCharacter.position.set(
          interpolated.wrappedPosition[0],
          interpolated.wrappedPosition[1] + 0.4,
          interpolated.wrappedPosition[2],
        )
      } else {
        wrappedCharacter.visible = false
      }

      for (const model of [modelRef.current, wrappedModelRef.current]) {
        if (model) {
          model.rotation.y =
            DIRECTION_YAW[direction.current as Exclude<Direction, 'NONE'>]
        }
      }

      if (progress.current >= 1) {
        currentTile.current = { ...move.to }
        activeMove.current = null
        progress.current = 0

        // Replace the tunnel counterpart with the primary model at exactly the
        // same world position, so no frame crosses the width of the board.
        const [x, y, z] = gridToActorWorld(currentTile.current, level)
        character.position.set(x, y + 0.4, z)
        wrappedCharacter.visible = false

        store.setPlayerTile(currentTile.current)
        store.collectTicket(currentTile.current)
        store.collectPellet(currentTile.current)
      }
    } else {
      wrappedCharacter.visible = false
    }

    playerWorldPosition.copy(
      wrappedCharacter.visible && progress.current >= 0.5
        ? wrappedCharacter.position
        : character.position,
    )

    elapsed.current += frameDelta
    const moving = direction.current !== 'NONE'
    const pulse = moving ? Math.abs(Math.sin(elapsed.current * 11)) : 0.28
    for (const mouth of [mouthRef.current, wrappedMouthRef.current]) {
      if (!mouth) continue
      mouth.scale.x = 0.34 + pulse * 0.66
      mouth.scale.z = 0.34 + pulse * 0.66
    }
    for (const model of [modelRef.current, wrappedModelRef.current]) {
      if (!model) continue
      const bob = moving ? Math.sin(elapsed.current * 10) * 0.025 : 0
      model.position.y = bob
      model.scale.y = 1 - Math.abs(bob) * 1.5
    }
  })

  return (
    <group>
      <group ref={characterRef}>
        <PacmanModel modelRef={modelRef} mouthRef={mouthRef} />
      </group>
      <group ref={wrappedCharacterRef} visible={false}>
        <PacmanModel modelRef={wrappedModelRef} mouthRef={wrappedMouthRef} />
      </group>
    </group>
  )
}
