/* eslint-disable react-hooks/immutability -- R3F cameras are intentionally mutated in useFrame. */
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { playerWorldPosition } from '../game/runtime'
import { useGameStore } from '../store/gameStore'

export function CameraRig() {
  const camera = useThree((state) => state.camera)
  const status = useGameStore((state) => state.status)
  const cameraPunch = useGameStore((state) => state.cameraPunch)
  const punch = useRef(0)
  const basePosition = useRef(new THREE.Vector3(0, 16.5, 14.5))
  const desiredPosition = useRef(new THREE.Vector3())
  const lookTarget = useRef(new THREE.Vector3())
  const desiredTarget = useRef(new THREE.Vector3())

  useEffect(() => {
    if (cameraPunch > 0) punch.current = 1
  }, [cameraPunch])

  useFrame(({ clock }, delta) => {
    const frameDelta = Math.min(delta, 0.05)
    punch.current = Math.max(0, punch.current - frameDelta * 3.2)

    desiredPosition.current.set(
      playerWorldPosition.x * 0.045,
      16.5 - punch.current * 0.34,
      14.5 + playerWorldPosition.z * 0.025 - punch.current * 0.3,
    )
    const damping = 1 - Math.exp(-frameDelta * 2.1)
    basePosition.current.lerp(desiredPosition.current, damping)
    desiredTarget.current.set(
      playerWorldPosition.x * 0.055,
      0,
      playerWorldPosition.z * 0.04,
    )
    lookTarget.current.lerp(desiredTarget.current, damping)

    camera.position.copy(basePosition.current)
    if (status === 'dying') {
      const time = clock.elapsedTime
      camera.position.x += Math.sin(time * 54) * 0.055
      camera.position.y += Math.sin(time * 41) * 0.04
    }
    camera.lookAt(lookTarget.current)
  })

  return null
}
