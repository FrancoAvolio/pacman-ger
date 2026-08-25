import { describe, expect, it } from 'vitest'
import {
  canCollectTicket,
  getTicketExpiry,
  isTicketExpired,
  shouldSpawnTicket,
  type TicketPhase,
} from './bonus'

describe('train ticket bonus', () => {
  it('spawns when sixty percent of the pellets have been eaten', () => {
    expect(shouldSpawnTicket(59, 100, 0.6, 'waiting')).toBe(false)
    expect(shouldSpawnTicket(60, 100, 0.6, 'waiting')).toBe(true)

    // Fractional thresholds round up so a ticket never appears too early.
    expect(shouldSpawnTicket(132, 221, 0.6, 'waiting')).toBe(false)
    expect(shouldSpawnTicket(133, 221, 0.6, 'waiting')).toBe(true)
  })

  it('can appear only once per level', () => {
    const phases: TicketPhase[] = ['visible', 'collected', 'expired']

    for (const phase of phases) {
      expect(shouldSpawnTicket(100, 100, 0.6, phase)).toBe(false)
    }
  })

  it('does not spawn from an empty total or an invalid ratio', () => {
    expect(shouldSpawnTicket(0, 0, 0.6, 'waiting')).toBe(false)
    expect(shouldSpawnTicket(60, 100, -0.1, 'waiting')).toBe(false)
    expect(shouldSpawnTicket(60, 100, 1.1, 'waiting')).toBe(false)
    expect(shouldSpawnTicket(60, 100, Number.NaN, 'waiting')).toBe(false)
  })

  it('computes and detects the ticket timeout at its exact deadline', () => {
    const expiresAt = getTicketExpiry(1_000, 8_000)

    expect(expiresAt).toBe(9_000)
    expect(isTicketExpired('visible', expiresAt, 8_999)).toBe(false)
    expect(isTicketExpired('visible', expiresAt, 9_000)).toBe(true)
    expect(isTicketExpired('collected', expiresAt, 10_000)).toBe(false)
  })

  it('allows collection only while visible, before expiry and on the ticket tile', () => {
    const baseCheck = {
      phase: 'visible' as const,
      expiresAt: 9_000,
      now: 8_999,
      playerTile: { row: 10, col: 10 },
      ticketTile: { row: 10, col: 10 },
    }

    expect(canCollectTicket(baseCheck)).toBe(true)
    expect(canCollectTicket({ ...baseCheck, playerTile: { row: 10, col: 9 } })).toBe(false)
    expect(canCollectTicket({ ...baseCheck, phase: 'waiting' })).toBe(false)
    expect(canCollectTicket({ ...baseCheck, phase: 'collected' })).toBe(false)
    expect(canCollectTicket({ ...baseCheck, phase: 'expired' })).toBe(false)
    expect(canCollectTicket({ ...baseCheck, now: 9_000 })).toBe(false)
  })
})
