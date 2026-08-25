import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { actorsCollide } from './collisions'

describe('actor collisions', () => {
  it('detects overlap on the gameplay plane', () => {
    expect(
      actorsCollide(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.3, 4, 0.2)),
    ).toBe(true)
  })

  it('does not collide actors farther than the hit radius', () => {
    expect(
      actorsCollide(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.5, 0, 0)),
    ).toBe(false)
  })
})
