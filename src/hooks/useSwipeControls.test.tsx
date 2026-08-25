import { fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useGameStore } from '../store/gameStore'
import { useSwipeControls } from './useSwipeControls'

type PointerData = {
  pointerId: number
  pointerType?: string
  isPrimary?: boolean
  clientX: number
  clientY: number
}

function pointerEvent(type: string, data: PointerData): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    pointerId: { value: data.pointerId },
    pointerType: { value: data.pointerType ?? 'touch' },
    isPrimary: { value: data.isPrimary ?? true },
    clientX: { value: data.clientX },
    clientY: { value: data.clientY },
  })
  return event
}

function dispatchPointer(element: HTMLElement, type: string, data: PointerData): Event {
  const event = pointerEvent(type, data)
  fireEvent(element, event)
  return event
}

function swipe(
  element: HTMLElement,
  pointerId: number,
  from: readonly [number, number],
  to: readonly [number, number],
): void {
  dispatchPointer(element, 'pointerdown', {
    pointerId,
    clientX: from[0],
    clientY: from[1],
  })
  dispatchPointer(element, 'pointermove', {
    pointerId,
    clientX: to[0],
    clientY: to[1],
  })
  dispatchPointer(element, 'pointerup', {
    pointerId,
    clientX: to[0],
    clientY: to[1],
  })
}

function SwipeHarness() {
  const targetRef = useRef<HTMLDivElement>(null)
  useSwipeControls(targetRef)
  return <div ref={targetRef} data-testid="swipe-target" style={{ touchAction: 'pan-y' }} />
}

describe('swipe controls', () => {
  it.each([
    ['RIGHT', [0, 0], [44, 4]],
    ['LEFT', [50, 10], [8, 14]],
    ['DOWN', [10, 5], [14, 48]],
    ['UP', [10, 50], [6, 8]],
  ] as const)('queues %s through the shared direction action', (direction, from, to) => {
    render(<SwipeHarness />)
    const target = screen.getByTestId('swipe-target')

    swipe(target, 1, from, to)

    expect(useGameStore.getState().queuedDirection).toBe(direction)
  })

  it('waits for the threshold, chooses the dominant axis and handles once per gesture', () => {
    render(<SwipeHarness />)
    const target = screen.getByTestId('swipe-target')

    dispatchPointer(target, 'pointerdown', { pointerId: 2, clientX: 0, clientY: 0 })
    dispatchPointer(target, 'pointermove', { pointerId: 2, clientX: 12, clientY: 20 })
    expect(useGameStore.getState().queuedDirection).toBe('NONE')

    dispatchPointer(target, 'pointermove', { pointerId: 2, clientX: 20, clientY: 40 })
    expect(useGameStore.getState().queuedDirection).toBe('DOWN')

    dispatchPointer(target, 'pointermove', { pointerId: 2, clientX: -80, clientY: 2 })
    expect(useGameStore.getState().queuedDirection).toBe('DOWN')
  })

  it('prevents native touch handling and captures then releases the pointer', () => {
    render(<SwipeHarness />)
    const target = screen.getByTestId('swipe-target')
    const setPointerCapture = vi.fn()
    const releasePointerCapture = vi.fn()
    Object.defineProperties(target, {
      setPointerCapture: { value: setPointerCapture, configurable: true },
      releasePointerCapture: { value: releasePointerCapture, configurable: true },
    })

    const down = dispatchPointer(target, 'pointerdown', {
      pointerId: 3,
      clientX: 20,
      clientY: 20,
    })
    const move = dispatchPointer(target, 'pointermove', {
      pointerId: 3,
      clientX: 60,
      clientY: 20,
    })
    dispatchPointer(target, 'pointercancel', {
      pointerId: 3,
      clientX: 60,
      clientY: 20,
    })

    expect(down.defaultPrevented).toBe(true)
    expect(move.defaultPrevented).toBe(true)
    expect(setPointerCapture).toHaveBeenCalledWith(3)
    expect(releasePointerCapture).toHaveBeenCalledWith(3)
  })

  it('ignores mouse, secondary touches and unrelated pointer ids', () => {
    render(<SwipeHarness />)
    const target = screen.getByTestId('swipe-target')

    dispatchPointer(target, 'pointerdown', {
      pointerId: 4,
      pointerType: 'mouse',
      clientX: 0,
      clientY: 0,
    })
    dispatchPointer(target, 'pointermove', {
      pointerId: 4,
      pointerType: 'mouse',
      clientX: 60,
      clientY: 0,
    })
    dispatchPointer(target, 'pointerdown', {
      pointerId: 5,
      isPrimary: false,
      clientX: 0,
      clientY: 0,
    })
    dispatchPointer(target, 'pointermove', {
      pointerId: 5,
      isPrimary: false,
      clientX: 60,
      clientY: 0,
    })
    dispatchPointer(target, 'pointermove', {
      pointerId: 99,
      clientX: 60,
      clientY: 0,
    })

    expect(useGameStore.getState().queuedDirection).toBe('NONE')
  })

  it('restores touch behavior and removes listeners when unmounted', () => {
    const view = render(<SwipeHarness />)
    const target = screen.getByTestId('swipe-target')
    expect(target.style.touchAction).toBe('none')

    view.unmount()
    expect(target.style.touchAction).toBe('pan-y')
    swipe(target, 6, [0, 0], [50, 0])
    expect(useGameStore.getState().queuedDirection).toBe('NONE')
  })
})
