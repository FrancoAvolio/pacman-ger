import type * as THREE from 'three'

const COLLISION_RADIUS_SQUARED = 0.48 * 0.48

export function actorsCollide(a: THREE.Vector3, b: THREE.Vector3): boolean {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return dx * dx + dz * dz <= COLLISION_RADIUS_SQUARED
}
