/* eslint-disable react-hooks/immutability -- R3F cameras are intentionally mutated in useFrame. */
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { playerWorldPosition } from '../game/runtime'
import { useGameStore } from '../store/gameStore'

const BASE_HEIGHT = 23
const BASE_DEPTH = 8.5
const CAMERA_FOV = 55
const BOARD_HALF_WIDTH_WITH_MARGIN = 14.4

export function CameraRig() {
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const size = useThree((state) => state.size)
  const status = useGameStore((state) => state.status)
  const cameraPunch = useGameStore((state) => state.cameraPunch)
  const punch = useRef(0)
  const basePosition = useRef(new THREE.Vector3(0, 16.5, 14.5))
  const desiredPosition = useRef(new THREE.Vector3())
  const lookTarget = useRef(new THREE.Vector3())
  const desiredTarget = useRef(new THREE.Vector3())
  const aspect = size.width / Math.max(1, size.height)
  const baseDistance = Math.hypot(BASE_HEIGHT, BASE_DEPTH)
  const forwardZ = BASE_DEPTH / baseDistance
  const cameraScale = Math.max(
    1.12,
    (BOARD_HALF_WIDTH_WITH_MARGIN /
      (Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2)) * aspect) +
      10 * forwardZ) /
      baseDistance,
  )
  const cameraHeight = BASE_HEIGHT * cameraScale
  const cameraDepth = BASE_DEPTH * cameraScale
  const cameraDistance = baseDistance * cameraScale

  useEffect(() => {
    basePosition.current.set(0, cameraHeight, cameraDepth)
    camera.position.copy(basePosition.current)
    camera.lookAt(0, 0, 0)

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = CAMERA_FOV
      camera.updateProjectionMatrix()
    }
    if (scene.fog instanceof THREE.Fog) {
      // Keep every gameplay tile before the fog. Fog now separates only the
      // board from the distant background instead of hiding the back rows.
      scene.fog.near = cameraDistance + 10
      scene.fog.far = cameraDistance + 34
    }
  }, [camera, cameraDepth, cameraDistance, cameraHeight, scene])

  useEffect(() => {
    if (cameraPunch > 0) punch.current = 1
  }, [cameraPunch])

  useFrame(({ clock }, delta) => {
    const frameDelta = Math.min(delta, 0.05)
    punch.current = Math.max(0, punch.current - frameDelta * 3.2)

    const horizontalFollow = 0.045 / cameraScale
    const depthFollow = 0.025 / cameraScale

    desiredPosition.current.set(
      playerWorldPosition.x * horizontalFollow,
      cameraHeight - punch.current * 0.34,
      cameraDepth + playerWorldPosition.z * depthFollow - punch.current * 0.3,
    )
    const damping = 1 - Math.exp(-frameDelta * 2.1)
    basePosition.current.lerp(desiredPosition.current, damping)
    desiredTarget.current.set(
      playerWorldPosition.x * (0.055 / cameraScale),
      0,
      playerWorldPosition.z * (0.04 / cameraScale),
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
