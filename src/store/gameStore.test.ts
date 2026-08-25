import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FRIGHTENED_DURATION_MS, RESPAWN_GRACE_MS } from '../game/constants'
import { findCells, getInitialPellets, tileKey } from '../game/maze'
import { audio } from '../game/audio'
import { useGameStore } from './gameStore'

describe('game store', () => {
  beforeEach(() => {
    vi.spyOn(audio, 'play').mockImplementation(() => undefined)
    vi.spyOn(audio, 'unlock').mockImplementation(() => undefined)
  })

  it('starts only from the ready state', () => {
    useGameStore.setState({ status: 'ready' })
    useGameStore.getState().startGame()
    expect(useGameStore.getState().status).toBe('playing')
    expect(audio.unlock).toHaveBeenCalledOnce()

    useGameStore.setState({ status: 'paused' })
    useGameStore.getState().startGame()
    expect(useGameStore.getState().status).toBe('paused')
  })

  it('queues directions and updates the logical player tile', () => {
    useGameStore.getState().queueDirection('LEFT')
    useGameStore.getState().setDirection('LEFT')
    useGameStore.getState().setPlayerTile({ row: 3, col: 4 })
    expect(useGameStore.getState()).toMatchObject({
      queuedDirection: 'LEFT',
      direction: 'LEFT',
      playerTile: { row: 3, col: 4 },
    })
  })

  it('scores pellets once and activates power mode', () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(1_000)
    const pellet = findCells('.')[0]
    const powerPellet = findCells('o')[0]
    const initialCount = useGameStore.getState().remainingPellets.size

    useGameStore.getState().collectPellet(pellet)
    useGameStore.getState().collectPellet(pellet)
    expect(useGameStore.getState().score).toBe(10)
    expect(useGameStore.getState().remainingPellets.size).toBe(initialCount - 1)

    clock.mockReturnValue(2_000)
    useGameStore.getState().collectPellet(powerPellet)
    expect(useGameStore.getState()).toMatchObject({
      score: 60,
      frightenedUntil: 2_000 + FRIGHTENED_DURATION_MS,
      ghostCombo: 0,
    })
    expect(audio.play).toHaveBeenCalledWith('pellet')
    expect(audio.play).toHaveBeenCalledWith('power')
  })

  it('finishes the level when the final pellet is collected', () => {
    const pellet = findCells('.')[0]
    useGameStore.setState({
      status: 'playing',
      remainingPellets: new Set([tileKey(pellet)]),
    })
    useGameStore.getState().collectPellet(pellet)
    expect(useGameStore.getState().status).toBe('level-complete')
    expect(audio.play).toHaveBeenCalledWith('levelComplete')
  })

  it('increments ghost combo points and camera feedback', () => {
    useGameStore.getState().eatGhost()
    useGameStore.getState().eatGhost()
    useGameStore.getState().eatGhost()
    expect(useGameStore.getState()).toMatchObject({
      score: 1_400,
      highScore: 1_400,
      ghostCombo: 3,
      cameraPunch: 3,
    })
    expect(audio.play).toHaveBeenCalledTimes(3)
  })

  it('prevents the residual collision from taking a second life after respawn', () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(10_000)
    useGameStore.setState({ status: 'playing', lives: 3, invulnerableUntil: 0 })

    useGameStore.getState().playerHit()
    expect(useGameStore.getState()).toMatchObject({ status: 'dying', lives: 2 })

    useGameStore.getState().finishDeath()
    expect(useGameStore.getState()).toMatchObject({
      status: 'playing',
      lives: 2,
      invulnerableUntil: 10_000 + RESPAWN_GRACE_MS,
    })

    // This is the old failure: another ghost frame arrives before refs reset.
    clock.mockReturnValue(10_001)
    useGameStore.getState().playerHit()
    expect(useGameStore.getState()).toMatchObject({ status: 'playing', lives: 2 })

    clock.mockReturnValue(10_000 + RESPAWN_GRACE_MS + 1)
    useGameStore.getState().playerHit()
    expect(useGameStore.getState()).toMatchObject({ status: 'dying', lives: 1 })
  })

  it('ends the game after the final death', () => {
    useGameStore.setState({ status: 'playing', lives: 1, invulnerableUntil: 0 })
    useGameStore.getState().playerHit()
    useGameStore.getState().finishDeath()
    expect(useGameStore.getState()).toMatchObject({ status: 'game-over', lives: 0 })
  })

  it('freezes timed effects while paused', () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(1_500)
    useGameStore.setState({
      status: 'paused',
      pausedAt: 1_000,
      frightenedUntil: 4_000,
      invulnerableUntil: 3_000,
    })
    useGameStore.getState().togglePause()
    expect(useGameStore.getState()).toMatchObject({
      status: 'playing',
      pausedAt: null,
      frightenedUntil: 4_500,
      invulnerableUntil: 3_500,
    })

    clock.mockReturnValue(2_000)
    useGameStore.getState().togglePause()
    expect(useGameStore.getState()).toMatchObject({ status: 'paused', pausedAt: 2_000 })
  })

  it('resets a new game and the player independently', () => {
    useGameStore.setState({
      status: 'game-over',
      score: 900,
      lives: 0,
      remainingPellets: new Set(),
      playerTile: { row: 1, col: 1 },
      invulnerableUntil: 99_999,
    })
    const previousRound = useGameStore.getState().roundId
    useGameStore.getState().newGame()
    expect(useGameStore.getState()).toMatchObject({
      status: 'playing',
      score: 0,
      lives: 3,
      invulnerableUntil: 0,
      roundId: previousRound + 1,
    })
    expect(useGameStore.getState().remainingPellets.size).toBe(getInitialPellets().size)

    useGameStore.getState().setDirection('UP')
    useGameStore.getState().queueDirection('RIGHT')
    useGameStore.getState().setPlayerTile({ row: 1, col: 1 })
    useGameStore.getState().resetPlayer()
    expect(useGameStore.getState()).toMatchObject({
      direction: 'NONE',
      queuedDirection: 'NONE',
      playerTile: { row: 11, col: 10 },
    })
  })
})
