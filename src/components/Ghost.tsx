import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { actorsCollide } from '../game/collisions'
import {
  EATEN_GHOST_SPEED,
  FRIGHTENED_GHOST_SPEED,
  GHOST_SPEED,
} from '../game/constants'
import {
  chooseGhostDirection,
  getGhostTarget,
  SCATTER_TARGETS,
  scheduledGhostState,
} from '../game/ghostAI'
import { findCells, gridToWorld } from '../game/maze'
import { nextTile, positionsEqual } from '../game/movement'
import { ghostTiles, playerWorldPosition } from '../game/runtime'
import type {
  Direction,
  GhostPersonality,
  GhostState,
  GridPosition,
} from '../game/types'
import { useGameStore } from '../store/gameStore'

const GHOST_COLORS: Record<GhostPersonality, string> = {
  RED: '#ff405c',
  PINK: '#ff7eb6',
  CYAN: '#43dff1',
  ORANGE: '#ff9f43',
}

const GHOST_YAW: Record<Exclude<Direction, 'NONE'>, number> = {
  DOWN: 0,
  RIGHT: Math.PI / 2,
  UP: Math.PI,
  LEFT: -Math.PI / 2,
}

type GhostProps = {
  id: string
  personality: GhostPersonality
  spawnIndex: number
}

export function Ghost({ id, personality, spawnIndex }: GhostProps) {
  const roundId = useGameStore((state) => state.roundId)
  const [visualState, setVisualState] = useState<GhostState>('SCATTER')
  const rootRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group>(null)
  const spawn = useMemo(() => findCells('G')[spawnIndex], [spawnIndex])
  const currentTile = useRef<GridPosition>({ ...spawn })
  const targetTile = useRef<GridPosition>({ ...spawn })
  const direction = useRef<Direction>(spawnIndex % 2 === 0 ? 'LEFT' : 'RIGHT')
  const progress = useRef(0)
  const activeSeconds = useRef(0)
  const stateRef = useRef<GhostState>('SCATTER')
  const mayReverse = useRef(false)
  const eaten = useRef(false)
  const bobTime = useRef(spawnIndex * 0.7)

  useLayoutEffect(() => {
    currentTile.current = { ...spawn }
    targetTile.current = { ...spawn }
    direction.current = spawnIndex % 2 === 0 ? 'LEFT' : 'RIGHT'
    progress.current = 0
    activeSeconds.current = 0
    stateRef.current = 'SCATTER'
    mayReverse.current = false
    eaten.current = false
    // A new round must also reset rendering state left by FRIGHTENED/EATEN.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisualState('SCATTER')
    const [x, , z] = gridToWorld(spawn)
    rootRef.current?.position.set(x, 0.48, z)
    ghostTiles.set(id, { ...spawn })
  }, [id, roundId, spawn, spawnIndex])

  useFrame((_, delta) => {
    const root = rootRef.current
    if (!root) return
    const frameDelta = Math.min(delta, 0.05)
    const store = useGameStore.getState()
    if (store.status !== 'playing') return
    const now = performance.now()

    activeSeconds.current += frameDelta
    const baseState = scheduledGhostState(activeSeconds.current)
    const nextState: GhostState = eaten.current
      ? 'EATEN'
      : now < store.frightenedUntil
        ? 'FRIGHTENED'
        : baseState

    if (nextState !== stateRef.current) {
      stateRef.current = nextState
      mayReverse.current = true
      setVisualState(nextState)
    }

    if (progress.current === 0) {
      const playerTile = store.playerTile
      const redTile = ghostTiles.get('red') ?? playerTile
      const target =
        nextState === 'EATEN'
          ? spawn
          : nextState === 'SCATTER'
            ? SCATTER_TARGETS[personality]
            : getGhostTarget(
                personality,
                playerTile,
                store.direction,
                redTile,
                currentTile.current,
              )

      direction.current = chooseGhostDirection({
        tile: currentTile.current,
        currentDirection: direction.current,
        target,
        state: nextState,
        mayReverse: mayReverse.current,
      })
      mayReverse.current = false
      targetTile.current = nextTile(currentTile.current, direction.current)
    }

    const speed =
      nextState === 'EATEN'
        ? EATEN_GHOST_SPEED
        : nextState === 'FRIGHTENED'
          ? FRIGHTENED_GHOST_SPEED
          : GHOST_SPEED
    progress.current = Math.min(1, progress.current + speed * frameDelta)

    const from = gridToWorld(currentTile.current)
    const to = gridToWorld(targetTile.current)
    root.position.x = THREE.MathUtils.lerp(from[0], to[0], progress.current)
    root.position.z = THREE.MathUtils.lerp(from[2], to[2], progress.current)

    if (modelRef.current) {
      modelRef.current.rotation.y = GHOST_YAW[direction.current as Exclude<Direction, 'NONE'>]
      bobTime.current += frameDelta
      modelRef.current.position.y = Math.sin(bobTime.current * 7) * 0.035
      modelRef.current.rotation.z = Math.sin(bobTime.current * 5) * 0.035
    }

    if (progress.current >= 1) {
      currentTile.current = { ...targetTile.current }
      ghostTiles.set(id, currentTile.current)
      progress.current = 0

      if (eaten.current && positionsEqual(currentTile.current, spawn)) {
        eaten.current = false
        stateRef.current = baseState
        setVisualState(baseState)
        mayReverse.current = true
      }
    }

    if (
      !eaten.current &&
      now >= store.invulnerableUntil &&
      actorsCollide(root.position, playerWorldPosition)
    ) {
      if (nextState === 'FRIGHTENED') {
        eaten.current = true
        stateRef.current = 'EATEN'
        setVisualState('EATEN')
        mayReverse.current = true
        store.eatGhost()
      } else {
        store.playerHit()
      }
    }
  })

  const frightened = visualState === 'FRIGHTENED'
  const eyesOnly = visualState === 'EATEN'
  const bodyColor = frightened ? '#2449d8' : GHOST_COLORS[personality]

  return (
    <group ref={rootRef}>
      <group ref={modelRef}>
        <group visible={!eyesOnly}>
          <mesh castShadow position-y={0.08}>
            <sphereGeometry args={[0.34, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color={bodyColor}
              emissive={bodyColor}
              emissiveIntensity={frightened ? 0.7 : 0.28}
              roughness={0.42}
            />
          </mesh>
          <mesh castShadow position-y={-0.11}>
            <cylinderGeometry args={[0.34, 0.36, 0.4, 24]} />
            <meshStandardMaterial
              color={bodyColor}
              emissive={bodyColor}
              emissiveIntensity={frightened ? 0.7 : 0.28}
              roughness={0.42}
            />
          </mesh>
          {[-0.23, 0, 0.23].map((x) => (
            <mesh key={x} position={[x, -0.32, 0]}>
              <sphereGeometry args={[0.135, 14, 9]} />
              <meshStandardMaterial
                color={bodyColor}
                emissive={bodyColor}
                emissiveIntensity={frightened ? 0.7 : 0.28}
              />
            </mesh>
          ))}
        </group>

        {[-0.13, 0.13].map((x) => (
          <group key={x} position={[x, 0.07, 0.285]}>
            <mesh scale={[0.82, 1, 0.55]}>
              <sphereGeometry args={[0.105, 14, 10]} />
              <meshBasicMaterial color={frightened ? '#f4f7ff' : '#ffffff'} />
            </mesh>
            <mesh position-z={0.067} scale={[0.8, 1, 0.5]}>
              <sphereGeometry args={[0.05, 10, 8]} />
              <meshBasicMaterial color={frightened ? '#ffb9cf' : '#172761'} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}
