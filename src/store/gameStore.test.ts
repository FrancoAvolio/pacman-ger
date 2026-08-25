import { beforeEach, describe, expect, it, vi } from 'vitest'
import { audio } from '../game/audio'
import { RESPAWN_GRACE_MS } from '../game/constants'
import { DEV_MODE } from '../game/dev'
import { DEFAULT_LEVEL, FINAL_LEVEL, getLevelConfig, type LevelNumber } from '../game/levels'
import { cellAt, findCells, getInitialPellets, tileKey } from '../game/maze'
import { useGameStore } from './gameStore'

function setPlayingLevel(level: LevelNumber = 1): void {
  const config = getLevelConfig(level)
  useGameStore.setState({
    level,
    status: 'playing',
    score: 0,
    lives: 3,
    remainingPellets: getInitialPellets(config.maze),
    pelletsEaten: 0,
    frightenedUntil: 0,
    invulnerableUntil: 0,
    ticketPhase: 'waiting',
    ticketExpiresAt: 0,
  })
}

function leaveOnlyFinalPellet(level: LevelNumber): { row: number; col: number } {
  const config = getLevelConfig(level)
  const pellet = findCells('.', config.maze)[0]
  useGameStore.setState({
    level,
    status: 'playing',
    remainingPellets: new Set([tileKey(pellet)]),
    pelletsEaten: getInitialPellets(config.maze).size - 1,
    ticketPhase: 'expired',
  })
  return pellet
}

describe('game store', () => {
  beforeEach(() => {
    vi.spyOn(audio, 'play').mockImplementation(() => undefined)
    vi.spyOn(audio, 'unlock').mockImplementation(() => undefined)
    vi.spyOn(audio, 'setMuted').mockImplementation(() => undefined)
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

  it('scores each pellet once and uses the active level frightened duration', () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(1_000)
    setPlayingLevel(2)
    const config = getLevelConfig(2)
    const pellet = findCells('.', config.maze)[0]
    const powerPellet = findCells('o', config.maze)[0]
    const initialCount = useGameStore.getState().remainingPellets.size

    useGameStore.getState().collectPellet(pellet)
    useGameStore.getState().collectPellet(pellet)
    expect(useGameStore.getState().score).toBe(10)
    expect(useGameStore.getState().remainingPellets.size).toBe(initialCount - 1)

    clock.mockReturnValue(2_000)
    useGameStore.getState().collectPellet(powerPellet)
    expect(useGameStore.getState()).toMatchObject({
      score: 60,
      frightenedUntil: 2_000 + config.frightenedDurationMs,
      ghostCombo: 0,
    })
    expect(audio.play).toHaveBeenCalledWith('pellet')
    expect(audio.play).toHaveBeenCalledWith('power')
  })

  it('ignores collectible updates outside active play', () => {
    const pellet = findCells('.', DEFAULT_LEVEL.maze)[0]
    const before = useGameStore.getState().remainingPellets.size
    useGameStore.setState({ status: 'paused' })
    useGameStore.getState().collectPellet(pellet)
    useGameStore.getState().collectTicket(DEFAULT_LEVEL.bonus.spawnTile)
    expect(useGameStore.getState()).toMatchObject({ score: 0, ticketPhase: 'waiting' })
    expect(useGameStore.getState().remainingPellets.size).toBe(before)
  })

  it('completes a level, preserves campaign progress, and prepares the next map', () => {
    setPlayingLevel(1)
    useGameStore.setState({ score: 420, highScore: 1_200, lives: 2 })
    const finalPellet = leaveOnlyFinalPellet(1)
    useGameStore.getState().collectPellet(finalPellet)

    expect(useGameStore.getState()).toMatchObject({
      status: 'level-complete',
      level: 1,
      score: 430,
      highScore: 1_200,
      lives: 2,
    })
    expect(audio.play).toHaveBeenCalledWith('levelComplete')

    const previousRound = useGameStore.getState().roundId
    useGameStore.getState().finishLevelTransition()
    expect(useGameStore.getState()).toMatchObject({
      status: 'level-ready',
      level: 2,
      score: 430,
      highScore: 1_200,
      lives: 2,
      pelletsEaten: 0,
      ticketPhase: 'waiting',
      roundId: previousRound + 1,
    })
    expect(useGameStore.getState().remainingPellets.size).toBe(
      getInitialPellets(getLevelConfig(2).maze).size,
    )

    useGameStore.getState().beginLevel()
    expect(useGameStore.getState().status).toBe('playing')
  })

  it('progresses through Level 3 into the final campaign state', () => {
    setPlayingLevel(FINAL_LEVEL.id)
    useGameStore.setState({ score: 2_000, lives: 1 })
    const finalPellet = leaveOnlyFinalPellet(FINAL_LEVEL.id)
    useGameStore.getState().collectPellet(finalPellet)
    useGameStore.getState().finishLevelTransition()

    expect(useGameStore.getState()).toMatchObject({
      status: 'campaign-complete',
      level: 3,
      score: 2_010,
      lives: 1,
    })
    expect(audio.play).toHaveBeenCalledWith('gameComplete')
  })

  it('completes all reachable pellets across the three-level campaign end to end', () => {
    setPlayingLevel(1)
    useGameStore.setState({ lives: 2 })
    let expectedScore = 0

    for (const level of [1, 2, 3] as const) {
      const config = getLevelConfig(level)
      const pellets = [...findCells('.', config.maze), ...findCells('o', config.maze)]
      for (const pellet of pellets) {
        expectedScore += cellAt(pellet, config.maze) === 'o' ? 50 : 10
        useGameStore.getState().collectPellet(pellet)
      }

      expect(useGameStore.getState()).toMatchObject({
        level,
        status: 'level-complete',
        score: expectedScore,
        lives: 2,
      })
      expect(useGameStore.getState().remainingPellets.size).toBe(0)
      useGameStore.getState().finishLevelTransition()

      if (level < 3) {
        expect(useGameStore.getState()).toMatchObject({
          level: level + 1,
          status: 'level-ready',
          score: expectedScore,
          lives: 2,
        })
        useGameStore.getState().beginLevel()
      }
    }

    expect(useGameStore.getState()).toMatchObject({
      level: 3,
      status: 'campaign-complete',
      score: expectedScore,
      lives: 2,
    })
  })

  it('does not advance a level transition twice', () => {
    setPlayingLevel(1)
    const finalPellet = leaveOnlyFinalPellet(1)
    useGameStore.getState().collectPellet(finalPellet)
    useGameStore.getState().finishLevelTransition()
    useGameStore.getState().finishLevelTransition()
    expect(useGameStore.getState()).toMatchObject({ level: 2, status: 'level-ready' })
  })

  it('spawns the ticket once at the configured pellet threshold', () => {
    vi.spyOn(performance, 'now').mockReturnValue(5_000)
    setPlayingLevel(1)
    const config = getLevelConfig(1)
    const pellets = [...findCells('.', config.maze), ...findCells('o', config.maze)]
    const threshold = Math.ceil(pellets.length * config.bonus.pelletThreshold)

    for (const pellet of pellets.slice(0, threshold - 1)) {
      useGameStore.getState().collectPellet(pellet)
    }
    expect(useGameStore.getState().ticketPhase).toBe('waiting')

    useGameStore.getState().collectPellet(pellets[threshold - 1])
    expect(useGameStore.getState()).toMatchObject({
      ticketPhase: 'visible',
      ticketExpiresAt: 5_000 + config.bonus.visibleDurationMs,
    })
    expect(audio.play).toHaveBeenCalledWith('ticketSpawn')

    useGameStore.getState().collectPellet(pellets[threshold])
    expect(
      vi.mocked(audio.play).mock.calls.filter(([cue]) => cue === 'ticketSpawn'),
    ).toHaveLength(1)
  })

  it('collects a live ticket exactly once for 1000 points', () => {
    vi.spyOn(performance, 'now').mockReturnValue(1_000)
    setPlayingLevel(1)
    useGameStore.setState({ score: 80, ticketPhase: 'visible', ticketExpiresAt: 2_000 })

    useGameStore.getState().collectTicket(DEFAULT_LEVEL.bonus.spawnTile)
    useGameStore.getState().collectTicket(DEFAULT_LEVEL.bonus.spawnTile)

    expect(useGameStore.getState()).toMatchObject({
      score: 1_080,
      ticketPhase: 'collected',
      ticketCollectionId: 1,
    })
    expect(audio.play).toHaveBeenCalledTimes(1)
    expect(audio.play).toHaveBeenCalledWith('ticketCollect')
  })

  it('expires an uncollected ticket at its deadline', () => {
    setPlayingLevel(1)
    useGameStore.setState({ ticketPhase: 'visible', ticketExpiresAt: 2_000 })
    useGameStore.getState().expireTicket(1_999)
    expect(useGameStore.getState().ticketPhase).toBe('visible')

    useGameStore.getState().expireTicket(2_000)
    expect(useGameStore.getState()).toMatchObject({ ticketPhase: 'expired', score: 0 })
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

  it('prevents a residual collision from taking a second life after respawn', () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(10_000)
    setPlayingLevel(2)

    useGameStore.getState().playerHit()
    expect(useGameStore.getState()).toMatchObject({ status: 'dying', lives: 2 })

    const previousRound = useGameStore.getState().roundId
    useGameStore.getState().finishDeath()
    expect(useGameStore.getState()).toMatchObject({
      status: 'playing',
      level: 2,
      lives: 2,
      roundId: previousRound + 1,
      invulnerableUntil: 10_000 + RESPAWN_GRACE_MS,
    })

    // Every ghost can still finish the collision frame that killed the player.
    for (let ghost = 0; ghost < 4; ghost += 1) {
      clock.mockReturnValue(10_001 + ghost)
      useGameStore.getState().playerHit()
    }
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

  it('freezes frightened, respawn, and ticket timers while paused', () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(1_500)
    useGameStore.setState({
      status: 'paused',
      pausedAt: 1_000,
      frightenedUntil: 4_000,
      invulnerableUntil: 3_000,
      ticketPhase: 'visible',
      ticketExpiresAt: 5_000,
    })
    useGameStore.getState().togglePause()
    expect(useGameStore.getState()).toMatchObject({
      status: 'playing',
      pausedAt: null,
      frightenedUntil: 4_500,
      invulnerableUntil: 3_500,
      ticketExpiresAt: 5_500,
    })

    clock.mockReturnValue(2_000)
    useGameStore.getState().togglePause()
    expect(useGameStore.getState()).toMatchObject({ status: 'paused', pausedAt: 2_000 })
  })

  it('persists the mute preference and unlocks audio when enabling it', () => {
    useGameStore.setState({ muted: false })
    useGameStore.getState().toggleMute()
    expect(useGameStore.getState().muted).toBe(true)
    expect(localStorage.getItem('geral-muted')).toBe('true')
    expect(audio.setMuted).toHaveBeenLastCalledWith(true)

    useGameStore.getState().toggleMute()
    expect(useGameStore.getState().muted).toBe(false)
    expect(audio.setMuted).toHaveBeenLastCalledWith(false)
    expect(audio.unlock).toHaveBeenCalledOnce()
  })

  it('starts a completely new Level 1 game and resets the player independently', () => {
    useGameStore.setState({
      level: 3,
      status: 'campaign-complete',
      score: 900,
      highScore: 5_000,
      lives: 1,
      remainingPellets: new Set(),
      pelletsEaten: 200,
      playerTile: { row: 1, col: 1 },
      invulnerableUntil: 99_999,
      ticketPhase: 'collected',
      ticketCollectionId: 2,
    })
    const previousRound = useGameStore.getState().roundId
    useGameStore.getState().newGame()
    expect(useGameStore.getState()).toMatchObject({
      level: 1,
      status: 'playing',
      score: 0,
      highScore: 5_000,
      lives: 3,
      pelletsEaten: 0,
      invulnerableUntil: 0,
      ticketPhase: 'waiting',
      ticketCollectionId: 0,
      roundId: previousRound + 1,
    })
    expect(useGameStore.getState().remainingPellets.size).toBe(
      getInitialPellets(DEFAULT_LEVEL.maze).size,
    )

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

  it('keeps the selected difficulty through deaths and level progression', () => {
    useGameStore.setState({ status: 'ready' })
    useGameStore.getState().setDifficulty('tranqui')
    expect(useGameStore.getState()).toMatchObject({ difficulty: 'tranqui', lives: 5 })

    useGameStore.getState().startGame()
    expect(useGameStore.getState().lives).toBe(5)
    useGameStore.getState().playerHit()
    expect(useGameStore.getState().difficulty).toBe('tranqui')
    useGameStore.getState().finishDeath()
    expect(useGameStore.getState().difficulty).toBe('tranqui')

    const finalPellet = leaveOnlyFinalPellet(1)
    useGameStore.getState().collectPellet(finalPellet)
    useGameStore.getState().finishLevelTransition()
    expect(useGameStore.getState()).toMatchObject({
      level: 2,
      difficulty: 'tranqui',
      lives: 4,
    })
  })

  it('uses the selected difficulty lives when starting a new campaign', () => {
    useGameStore.setState({ status: 'ready' })
    useGameStore.getState().setDifficulty('tranqui')
    useGameStore.getState().newGame()
    expect(useGameStore.getState()).toMatchObject({
      level: 1,
      status: 'playing',
      difficulty: 'tranqui',
      lives: 5,
    })

    useGameStore.setState({ status: 'game-over', lives: 0 })
    useGameStore.getState().newGame()
    expect(useGameStore.getState()).toMatchObject({ difficulty: 'tranqui', lives: 5 })
  })

  it('returns from pause to the difficulty menu with a clean campaign', () => {
    useGameStore.setState({
      status: 'paused',
      level: 3,
      difficulty: 'tranqui',
      score: 1_240,
      lives: 2,
      devInvulnerable: true,
      devDebug: true,
    })
    const previousRound = useGameStore.getState().roundId

    useGameStore.getState().returnToMenu()

    expect(useGameStore.getState()).toMatchObject({
      status: 'ready',
      level: 1,
      difficulty: 'tranqui',
      score: 0,
      lives: 5,
      pausedAt: null,
      devInvulnerable: false,
      devDebug: false,
      roundId: previousRound + 1,
    })
    expect(useGameStore.getState().remainingPellets.size).toBe(
      getInitialPellets(DEFAULT_LEVEL.maze).size,
    )
  })

  it('jumps between clean levels in development while preserving campaign stats', () => {
    useGameStore.setState({ status: 'playing', difficulty: 'arcade', score: 900, lives: 2 })
    useGameStore.getState().devLoadLevel(3)
    if (!DEV_MODE) {
      expect(useGameStore.getState().level).toBe(1)
      return
    }
    expect(useGameStore.getState()).toMatchObject({
      level: 3,
      status: 'playing',
      difficulty: 'arcade',
      score: 900,
      lives: 2,
      pelletsEaten: 0,
      ticketPhase: 'waiting',
    })
    expect(useGameStore.getState().remainingPellets.size).toBe(
      getInitialPellets(getLevelConfig(3).maze).size,
    )
  })

  it('keeps the player safe in dev mode without disabling ghost rewards', () => {
    useGameStore.setState({ status: 'playing', devInvulnerable: true, lives: 3 })
    useGameStore.getState().playerHit()
    if (!DEV_MODE) {
      expect(useGameStore.getState()).toMatchObject({ status: 'playing', lives: 3 })
      return
    }
    expect(useGameStore.getState()).toMatchObject({ status: 'playing', lives: 3 })

    useGameStore.getState().eatGhost()
    expect(useGameStore.getState().score).toBe(200)
  })
})
