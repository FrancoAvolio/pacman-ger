import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { LevelConfig } from '../game/levels'
import { gridToActorWorld } from '../game/maze'
import { useGameStore } from '../store/gameStore'

type BonusTicketProps = {
  level: LevelConfig
}

export function BonusTicket({ level }: BonusTicketProps) {
  const ticketRef = useRef<THREE.Group>(null)
  const phase = useGameStore((state) => state.ticketPhase)
  const status = useGameStore((state) => state.status)
  const expiresAt = useGameStore((state) => state.ticketExpiresAt)
  const [x, , z] = useMemo(
    () => gridToActorWorld(level.bonus.spawnTile, level),
    [level],
  )

  useFrame(({ clock }) => {
    const now = performance.now()
    if (phase === 'visible' && status === 'playing' && now >= expiresAt) {
      useGameStore.getState().expireTicket(now)
    }

    const ticket = ticketRef.current
    if (!ticket) return
    ticket.position.y = 0.42 + Math.sin(clock.elapsedTime * 2.8) * 0.07
    ticket.rotation.y = clock.elapsedTime * 0.72
    ticket.rotation.z = Math.sin(clock.elapsedTime * 1.3) * 0.08
  })

  return (
    <group
      ref={ticketRef}
      position={[x, 0.42, z]}
      visible={phase === 'visible'}
      scale={0.92}
    >
      <mesh castShadow>
        <boxGeometry args={[0.68, 0.075, 0.38]} />
        <meshStandardMaterial
          color="#ffd34e"
          emissive="#b86800"
          emissiveIntensity={1.15}
          metalness={0.18}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 0.043, 0]}>
        <boxGeometry args={[0.055, 0.012, 0.3]} />
        <meshBasicMaterial color="#6a3a18" />
      </mesh>
      {[-0.21, 0.21].map((detailX) => (
        <mesh key={detailX} position={[detailX, 0.044, 0]}>
          <boxGeometry args={[0.12, 0.014, 0.035]} />
          <meshBasicMaterial color="#6a3a18" />
        </mesh>
      ))}
      <pointLight color="#ffc83d" intensity={1.2} distance={2.2} />
    </group>
  )
}
