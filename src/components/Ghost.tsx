import { useFrame } from '@react-three/fiber'
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import * as THREE from 'three'
import { actorsCollide } from '../game/collisions'
import {
  EATEN_GHOST_SPEED,
  FRIGHTENED_GHOST_SPEED,
  GHOST_SPEED,
} from '../game/constants'
import { getEffectiveGhostSpeed } from '../game/difficulty'
import { DEV_MODE } from '../game/dev'
import {
  chooseGhostDirection,
  getFrightenedVisualState,
  getGhostTarget,
  SCATTER_TARGETS,
  scheduledGhostState,
  shouldGhostMove,
  type FrightenedVisualState,
} from '../game/ghostAI'
import type { LevelConfig } from '../game/levels'
import { findCells, gridToActorWorld } from '../game/maze'
import {
  interpolateMove,
  positionsEqual,
  resolveMove,
  type ResolvedMove,
} from '../game/movement'
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

type GhostModelProps = {
  personality: GhostPersonality
  modelRef: RefObject<THREE.Group | null>
  visualState: GhostState
  frightenedVisual: FrightenedVisualState
}

function GhostModel({
  personality,
  modelRef,
  visualState,
  frightenedVisual,
}: GhostModelProps) {
  const frightened = visualState === 'FRIGHTENED'
  const eyesOnly = visualState === 'EATEN'
  const warning = frightened && frightenedVisual === 'WHITE'
  const bodyColor = warning
    ? '#f7fbff'
    : frightened
      ? '#2449d8'
      : GHOST_COLORS[personality]

  return (
    <group ref={modelRef}>
      <group visible={!eyesOnly}>
        <mesh castShadow position-y={0.08}>
          <sphereGeometry args={[0.34, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color={bodyColor}
            emissive={bodyColor}
            emissiveIntensity={frightened ? (warning ? 0.38 : 0.7) : 0.28}
            roughness={0.42}
          />
        </mesh>
        <mesh castShadow position-y={-0.11}>
          <cylinderGeometry args={[0.34, 0.36, 0.4, 24]} />
          <meshStandardMaterial
            color={bodyColor}
            emissive={bodyColor}
            emissiveIntensity={frightened ? (warning ? 0.38 : 0.7) : 0.28}
            roughness={0.42}
          />
        </mesh>
        {[-0.23, 0, 0.23].map((x) => (
          <mesh key={x} position={[x, -0.32, 0]}>
            <sphereGeometry args={[0.135, 14, 9]} />
            <meshStandardMaterial
              color={bodyColor}
              emissive={bodyColor}
              emissiveIntensity={frightened ? (warning ? 0.38 : 0.7) : 0.28}
            />
          </mesh>
        ))}
      </group>

      {[-0.13, 0.13].map((x) => (
        <group key={x} position={[x, 0.07, 0.285]}>
          <mesh scale={[0.82, 1, 0.55]}>
            <sphereGeometry args={[0.105, 14, 10]} />
            <meshBasicMaterial color={frightened && !warning ? '#f4f7ff' : '#ffffff'} />
          </mesh>
          <mesh position-z={0.067} scale={[0.8, 1, 0.5]}>
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshBasicMaterial
              color={frightened ? (warning ? '#2449d8' : '#ffb9cf') : '#172761'}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

type GhostProps = {
  id: string
  personality: GhostPersonality
  spawnIndex: number
  level: LevelConfig
}

export function Ghost({ id, personality, spawnIndex, level }: GhostProps) {
  const roundId = useGameStore((state) => state.roundId)
  const [visualState, setVisualState] = useState<GhostState>('SCATTER')
  const [frightenedVisual, setFrightenedVisual] =
    useState<FrightenedVisualState>('NORMAL')
  const rootRef = useRef<THREE.Group>(null)
  const wrappedRootRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group>(null)
  const wrappedModelRef = useRef<THREE.Group>(null)
  const spawn = useMemo(() => findCells('G', level)[spawnIndex], [level, spawnIndex])
  const currentTile = useRef<GridPosition>({ ...spawn })
  const activeMove = useRef<ResolvedMove | null>(null)
  const direction = useRef<Direction>(spawnIndex % 2 === 0 ? 'LEFT' : 'RIGHT')
  const progress = useRef(0)
  const activeRoundId = useRef(roundId)
  const activeSeconds = useRef(0)
  const stateRef = useRef<GhostState>('SCATTER')
  const frightenedVisualRef = useRef<FrightenedVisualState>('NORMAL')
  const mayReverse = useRef(false)
  const eaten = useRef(false)
  const bobTime = useRef(spawnIndex * 0.7)

  useLayoutEffect(() => {
    currentTile.current = { ...spawn }
    activeMove.current = null
    direction.current = spawnIndex % 2 === 0 ? 'LEFT' : 'RIGHT'
    progress.current = 0
    activeRoundId.current = roundId
    activeSeconds.current = 0
    stateRef.current = 'SCATTER'
    frightenedVisualRef.current = 'NORMAL'
    mayReverse.current = false
    eaten.current = false
    bobTime.current = spawnIndex * 0.7
    // A new round resets both gameplay and the low-frequency render state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisualState('SCATTER')
    setFrightenedVisual('NORMAL')
    const [x, , z] = gridToActorWorld(spawn, level)
    rootRef.current?.position.set(x, 0.48, z)
    wrappedRootRef.current?.position.set(x, 0.48, z)
    if (wrappedRootRef.current) wrappedRootRef.current.visible = false
    for (const model of [modelRef.current, wrappedModelRef.current]) {
      model?.position.set(0, 0, 0)
      model?.rotation.set(0, 0, 0)
    }
    ghostTiles.set(id, { ...spawn })
  }, [id, level, roundId, spawn, spawnIndex])

  useFrame((_, delta) => {
    const root = rootRef.current
    const wrappedRoot = wrappedRootRef.current
    if (!root || !wrappedRoot) return

    const frameDelta = Math.min(delta, 0.05)
    const store = useGameStore.getState()
    if (store.status !== 'playing' || store.roundId !== activeRoundId.current) return
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

    const nextFrightenedVisual =
      nextState === 'FRIGHTENED'
        ? getFrightenedVisualState(store.frightenedUntil - now)
        : 'NORMAL'
    if (nextFrightenedVisual !== frightenedVisualRef.current) {
      frightenedVisualRef.current = nextFrightenedVisual
      setFrightenedVisual(nextFrightenedVisual)
    }

    bobTime.current += frameDelta
    for (const model of [modelRef.current, wrappedModelRef.current]) {
      if (!model) continue
      model.position.y = Math.sin(bobTime.current * 7) * 0.035
      model.rotation.z = Math.sin(bobTime.current * 5) * 0.035
    }

    if (
      !shouldGhostMove(
        personality,
        activeSeconds.current * 1_000,
        nextState,
        level,
        store.difficulty,
      )
    ) {
      wrappedRoot.visible = false
      return
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
                level,
              )

      direction.current = chooseGhostDirection({
        tile: currentTile.current,
        currentDirection: direction.current,
        target,
        state: nextState,
        mayReverse: mayReverse.current,
        level,
      })
      mayReverse.current = false
      activeMove.current = resolveMove(currentTile.current, direction.current, level)
    }

    const move = activeMove.current
    if (!move) return

    const speed =
      nextState === 'EATEN'
        ? EATEN_GHOST_SPEED
        : nextState === 'FRIGHTENED'
          ? getEffectiveGhostSpeed(FRIGHTENED_GHOST_SPEED, level, store.difficulty)
          : getEffectiveGhostSpeed(GHOST_SPEED, level, store.difficulty)
    progress.current = Math.min(1, progress.current + speed * frameDelta)

    const interpolated = interpolateMove(move, progress.current, level)
    root.position.set(
      interpolated.position[0],
      interpolated.position[1] + 0.48,
      interpolated.position[2],
    )
    if (interpolated.wrappedPosition) {
      wrappedRoot.visible = true
      wrappedRoot.position.set(
        interpolated.wrappedPosition[0],
        interpolated.wrappedPosition[1] + 0.48,
        interpolated.wrappedPosition[2],
      )
    } else {
      wrappedRoot.visible = false
    }

    for (const model of [modelRef.current, wrappedModelRef.current]) {
      if (model) {
        model.rotation.y =
          GHOST_YAW[direction.current as Exclude<Direction, 'NONE'>]
      }
    }

    if (progress.current >= 1) {
      currentTile.current = { ...move.to }
      ghostTiles.set(id, currentTile.current)
      activeMove.current = null
      progress.current = 0
      const [x, , z] = gridToActorWorld(currentTile.current, level)
      root.position.set(x, 0.48, z)
      wrappedRoot.visible = false

      if (eaten.current && positionsEqual(currentTile.current, spawn)) {
        eaten.current = false
        stateRef.current = baseState
        setVisualState(baseState)
        mayReverse.current = true
      }
    }

    const collisionPosition =
      wrappedRoot.visible && progress.current >= 0.5
        ? wrappedRoot.position
        : root.position
    if (
      !eaten.current &&
      now >= store.invulnerableUntil &&
      actorsCollide(collisionPosition, playerWorldPosition)
    ) {
      if (nextState === 'FRIGHTENED') {
        eaten.current = true
        stateRef.current = 'EATEN'
        setVisualState('EATEN')
        frightenedVisualRef.current = 'NORMAL'
        setFrightenedVisual('NORMAL')
        mayReverse.current = true
        store.eatGhost()
      } else if (!(DEV_MODE && store.devInvulnerable)) {
        store.playerHit()
      }
    }
  })

  return (
    <group>
      <group ref={rootRef}>
        <GhostModel
          personality={personality}
          modelRef={modelRef}
          visualState={visualState}
          frightenedVisual={frightenedVisual}
        />
      </group>
      <group ref={wrappedRootRef} visible={false}>
        <GhostModel
          personality={personality}
          modelRef={wrappedModelRef}
          visualState={visualState}
          frightenedVisual={frightenedVisual}
        />
      </group>
    </group>
  )
}
