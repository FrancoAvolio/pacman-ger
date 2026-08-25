export type AudioCue =
  | 'pellet'
  | 'power'
  | 'ghostEaten'
  | 'death'
  | 'ticketSpawn'
  | 'ticketCollect'
  | 'levelComplete'
  | 'gameComplete'

// Add a URL here to replace any synthesized fallback with a custom sound.
// Missing or unavailable files always fall back safely instead of breaking play.
const CUSTOM_AUDIO: Partial<Record<AudioCue, string>> = {}

type SynthNote = {
  frequency: number
  duration: number
  slide: number
  wave: OscillatorType
  gain: number
}

const SYNTH_NOTES: Record<AudioCue, SynthNote> = {
  pellet: { frequency: 680, duration: 0.045, slide: 120, wave: 'square', gain: 0.035 },
  power: { frequency: 230, duration: 0.22, slide: 360, wave: 'square', gain: 0.06 },
  ghostEaten: { frequency: 420, duration: 0.24, slide: 540, wave: 'square', gain: 0.06 },
  death: { frequency: 310, duration: 0.7, slide: -250, wave: 'sawtooth', gain: 0.06 },
  ticketSpawn: { frequency: 360, duration: 0.18, slide: 260, wave: 'sine', gain: 0.045 },
  ticketCollect: { frequency: 660, duration: 0.32, slide: 440, wave: 'triangle', gain: 0.052 },
  levelComplete: { frequency: 520, duration: 0.58, slide: 470, wave: 'triangle', gain: 0.055 },
  gameComplete: { frequency: 440, duration: 0.82, slide: 880, wave: 'triangle', gain: 0.055 },
}

class GameAudio {
  private context: AudioContext | null = null

  private muted = false

  private getContext(): AudioContext | null {
    if (this.context) return this.context
    if (typeof window === 'undefined') return null
    const AudioContextClass = window.AudioContext
    if (!AudioContextClass) return null
    this.context = new AudioContextClass()
    return this.context
  }

  unlock(): void {
    const context = this.getContext()
    if (context?.state === 'suspended') void context.resume()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
  }

  isMuted(): boolean {
    return this.muted
  }

  play(cue: AudioCue): void {
    if (this.muted) return

    const customUrl = CUSTOM_AUDIO[cue]
    if (customUrl) {
      const sound = new Audio(customUrl)
      sound.volume = 0.45
      void sound.play().catch(() => this.playSynth(cue))
      return
    }

    this.playSynth(cue)
  }

  private playSynth(cue: AudioCue): void {
    if (this.muted) return

    const context = this.getContext()
    if (!context || context.state !== 'running') return

    const note = SYNTH_NOTES[cue]
    const now = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = note.wave
    oscillator.frequency.setValueAtTime(note.frequency, now)
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(35, note.frequency + note.slide),
      now + note.duration,
    )
    gain.gain.setValueAtTime(note.gain, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.duration)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + note.duration)
  }
}

export const audio = new GameAudio()
