import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useGameStore } from '../store/gameStore'
import { HUD } from './HUD'

describe('HUD', () => {
  it('renders score, high score and lives', () => {
    useGameStore.setState({ score: 120, highScore: 3_400, lives: 2, status: 'playing' })
    render(<HUD />)
    expect(screen.getByText('000120')).toBeInTheDocument()
    expect(screen.getByText('003400')).toBeInTheDocument()
    expect(screen.getByLabelText('2 vidas').children).toHaveLength(2)
  })

  it('continues or restarts from the pause overlay', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ status: 'paused', score: 200, lives: 2 })
    const { rerender } = render(<HUD />)
    expect(screen.getByRole('heading', { name: 'PAUSA' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(useGameStore.getState().status).toBe('playing')

    useGameStore.setState({ status: 'paused' })
    rerender(<HUD />)
    await user.click(screen.getByRole('button', { name: 'Reiniciar' }))
    expect(useGameStore.getState()).toMatchObject({ status: 'playing', score: 0, lives: 3 })
  })

  it('shows the personalized completion screen', () => {
    useGameStore.setState({ status: 'level-complete', score: 2_210 })
    render(<HUD />)
    expect(screen.getByText('Para Geraldine ♡')).toBeVisible()
    expect(screen.getByText('002210 puntos')).toBeVisible()
  })

  it('shows game over and allows a clean restart', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ status: 'game-over', score: 500, lives: 0 })
    render(<HUD />)
    expect(screen.getByRole('heading', { name: 'GAME OVER' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Intentar de nuevo' }))
    expect(useGameStore.getState()).toMatchObject({ status: 'playing', score: 0, lives: 3 })
  })
})
