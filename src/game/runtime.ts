import * as THREE from 'three'
import type { GridPosition } from './types'

// Mutable frame data belongs outside React state so animation and collision
// checks do not force the HUD to render sixty times per second.
export const playerWorldPosition = new THREE.Vector3()

export const ghostTiles = new Map<string, GridPosition>()
