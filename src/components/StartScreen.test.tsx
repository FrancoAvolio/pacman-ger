import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { audio } from '../game/audio'
import { useGameStore } from '../store/gameStore'
import { StartScreen } from './StartScreen'

describe('StartScreen', () => {
  it('presents the gift message and starts the game', async () => {
    vi.spyOn(audio, 'unlock').mockImplementation(() => undefined)
    const user = userEvent.setup()
    useGameStore.setState({ status: 'ready' })
    render(<StartScreen />)
    expect(screen.getByRole('heading', { name: 'READY, GERAL?' })).toBeVisible()
    expect(screen.getByText('Una partida para vos.')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'ELEGÍ TU SUFRIMIENTO' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'NORMAL' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(screen.getByRole('button', { name: 'TRANQUI' }))
    expect(useGameStore.getState()).toMatchObject({ difficulty: 'tranqui', lives: 5 })
    await user.click(screen.getByRole('button', { name: 'Empezar partida' }))
    expect(useGameStore.getState()).toMatchObject({ status: 'playing', lives: 5 })
    expect(screen.queryByRole('heading', { name: 'READY, GERAL?' })).not.toBeInTheDocument()
  })

  it('does not cover an active game', () => {
    useGameStore.setState({ status: 'playing' })
    const { container } = render(<StartScreen />)
    expect(container).toBeEmptyDOMElement()
  })
})
