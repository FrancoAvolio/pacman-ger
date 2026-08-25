export type AudioCue =
  | 'pellet'
  | 'power'
  | 'ghostEaten'
  | 'death'
  | 'levelComplete'

// Add a URL here to replace any synthesized fallback with a custom sound.
// Missing or unavailable files always fall back safely instead of breaking play.
const CUSTOM_AUDIO: Partial<Record<AudioCue, string>> = {}

const SYNTH_NOTES: Record<AudioCue, { frequency: number; duration: number; slide: number }> = {
  pellet: { frequency: 680, duration: 0.045, slide: 120 },
  power: { frequency: 230, duration: 0.22, slide: 360 },
  ghostEaten: { frequency: 420, duration: 0.24, slide: 540 },
  death: { frequency: 310, duration: 0.7, slide: -250 },
  levelComplete: { frequency: 520, duration: 0.75, slide: 470 },
}

class GameAudio {
  private context: AudioContext | null = null

  private getContext(): AudioContext | null {
    if (this.context) return this.context
    const AudioContextClass = window.AudioContext
    if (!AudioContextClass) return null
    this.context = new AudioContextClass()
    return this.context
  }

  unlock(): void {
    const context = this.getContext()
    if (context?.state === 'suspended') void context.resume()
  }

  play(cue: AudioCue): void {
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
    const context = this.getContext()
    if (!context || context.state !== 'running') return

    const note = SYNTH_NOTES[cue]
    const now = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = cue === 'death' ? 'sawtooth' : 'square'
    oscillator.frequency.setValueAtTime(note.frequency, now)
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(35, note.frequency + note.slide),
      now + note.duration,
    )
    gain.gain.setValueAtTime(cue === 'pellet' ? 0.035 : 0.07, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.duration)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + note.duration)
  }
}

export const audio = new GameAudio()
