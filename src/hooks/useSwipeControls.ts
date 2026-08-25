import { useEffect, type RefObject } from 'react'
import type { Direction } from '../game/types'
import { useGameStore } from '../store/gameStore'

const SWIPE_THRESHOLD_PX = 28

type ActiveGesture = {
  pointerId: number
  startX: number
  startY: number
  handled: boolean
}

function directionFromDelta(deltaX: number, deltaY: number): Exclude<Direction, 'NONE'> {
  if (Math.abs(deltaX) >= Math.abs(deltaY)) return deltaX >= 0 ? 'RIGHT' : 'LEFT'
  return deltaY >= 0 ? 'DOWN' : 'UP'
}

export function useSwipeControls(targetRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = targetRef.current
    if (!element) return

    let activeGesture: ActiveGesture | null = null
    const previousTouchAction = element.style.touchAction
    element.style.touchAction = 'none'

    const releaseCapture = (pointerId: number) => {
      try {
        element.releasePointerCapture?.(pointerId)
      } catch {
        // Capture can already be gone after a native pointer cancellation.
      }
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.pointerType !== 'touch' ||
        event.isPrimary === false ||
        activeGesture !== null
      ) {
        return
      }

      event.preventDefault()
      activeGesture = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        handled: false,
      }

      try {
        element.setPointerCapture?.(event.pointerId)
      } catch {
        // Older browsers can expose Pointer Events without pointer capture.
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      const gesture = activeGesture
      if (!gesture || gesture.pointerId !== event.pointerId) return

      event.preventDefault()
      if (gesture.handled) return

      const deltaX = event.clientX - gesture.startX
      const deltaY = event.clientY - gesture.startY
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < SWIPE_THRESHOLD_PX) return

      gesture.handled = true
      useGameStore.getState().queueDirection(directionFromDelta(deltaX, deltaY))
    }

    const finishGesture = (event: PointerEvent) => {
      if (!activeGesture || activeGesture.pointerId !== event.pointerId) return
      const pointerId = activeGesture.pointerId
      activeGesture = null
      releaseCapture(pointerId)
    }

    const listenerOptions: AddEventListenerOptions = { passive: false }
    element.addEventListener('pointerdown', handlePointerDown, listenerOptions)
    element.addEventListener('pointermove', handlePointerMove, listenerOptions)
    element.addEventListener('pointerup', finishGesture)
    element.addEventListener('pointercancel', finishGesture)
    element.addEventListener('lostpointercapture', finishGesture)

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown, listenerOptions)
      element.removeEventListener('pointermove', handlePointerMove, listenerOptions)
      element.removeEventListener('pointerup', finishGesture)
      element.removeEventListener('pointercancel', finishGesture)
      element.removeEventListener('lostpointercapture', finishGesture)
      if (activeGesture) releaseCapture(activeGesture.pointerId)
      activeGesture = null
      element.style.touchAction = previousTouchAction
    }
  }, [targetRef])
}
