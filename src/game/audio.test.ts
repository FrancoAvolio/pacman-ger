import { describe, expect, it, vi } from 'vitest'
import { audio, type AudioCue } from './audio'

describe('game audio', () => {
  it('stays safe when Web Audio is unavailable', () => {
    vi.stubGlobal('AudioContext', undefined)
    expect(() => audio.unlock()).not.toThrow()
    expect(() => audio.play('pellet')).not.toThrow()
  })

  it('unlocks the context and synthesizes every cue', () => {
    const oscillators: Array<{
      type: OscillatorType
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>
      }
      connect: ReturnType<typeof vi.fn>
      start: ReturnType<typeof vi.fn>
      stop: ReturnType<typeof vi.fn>
    }> = []
    const gains: Array<{
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>
      }
      connect: ReturnType<typeof vi.fn>
    }> = []

    class FakeAudioContext {
      state: AudioContextState = 'suspended'
      currentTime = 4
      destination = {}

      resume = vi.fn(() => {
        this.state = 'running'
        return Promise.resolve()
      })

      createOscillator() {
        const oscillator = {
          type: 'sine' as OscillatorType,
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        }
        oscillators.push(oscillator)
        return oscillator
      }

      createGain() {
        const gain = {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        }
        gains.push(gain)
        return gain
      }
    }

    vi.stubGlobal('AudioContext', FakeAudioContext)
    audio.unlock()
    const cues: AudioCue[] = ['pellet', 'power', 'ghostEaten', 'death', 'levelComplete']
    cues.forEach((cue) => audio.play(cue))

    expect(oscillators).toHaveLength(cues.length)
    expect(gains).toHaveLength(cues.length)
    expect(oscillators.every((oscillator) => oscillator.start.mock.calls.length === 1)).toBe(true)
    expect(oscillators.every((oscillator) => oscillator.stop.mock.calls.length === 1)).toBe(true)
    expect(oscillators[3].type).toBe('sawtooth')
    expect(oscillators[0].type).toBe('square')
  })
})
