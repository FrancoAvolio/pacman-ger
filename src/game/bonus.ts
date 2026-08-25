import type { GridPosition } from './types'

export type TicketPhase = 'waiting' | 'visible' | 'collected' | 'expired'

type TicketCollectionCheck = {
  phase: TicketPhase
  expiresAt: number
  now: number
  playerTile: GridPosition
  ticketTile: GridPosition
}

export function shouldSpawnTicket(
  eatenPellets: number,
  totalPellets: number,
  spawnRatio: number,
  phase: TicketPhase,
): boolean {
  if (phase !== 'waiting' || totalPellets <= 0) return false
  if (!Number.isFinite(spawnRatio) || spawnRatio < 0 || spawnRatio > 1) return false

  return eatenPellets >= Math.ceil(totalPellets * spawnRatio)
}

export function getTicketExpiry(spawnedAt: number, lifetimeMs: number): number {
  return spawnedAt + lifetimeMs
}

export function isTicketExpired(
  phase: TicketPhase,
  expiresAt: number,
  now: number,
): boolean {
  return phase === 'visible' && now >= expiresAt
}

export function canCollectTicket({
  phase,
  expiresAt,
  now,
  playerTile,
  ticketTile,
}: TicketCollectionCheck): boolean {
  return (
    phase === 'visible' &&
    !isTicketExpired(phase, expiresAt, now) &&
    playerTile.row === ticketTile.row &&
    playerTile.col === ticketTile.col
  )
}
