// Tiny WebAudio synth — no audio assets. Context is created lazily on the
// first call (always a user gesture: key press / button tap), so autoplay
// policies never block it. Every voice is short and mixed quiet; this is
// feedback, not a soundtrack.
export class Sound {
  constructor() {
    this.ctx = null
    this.master = null
  }

  _ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.16
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    return this.ctx
  }

  _tone({ type = 'sine', freq = 440, at = 0, dur = 0.2, peak = 1, glideTo = 0 }) {
    const ctx = this._ensure()
    if (!ctx) return
    const t0 = ctx.currentTime + at
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g).connect(this.master)
    osc.start(t0)
    osc.stop(t0 + dur + 0.05)
  }

  // Kart: friendly two-tone "meep-meep".
  horn() {
    this._tone({ type: 'square', freq: 392, dur: 0.14, peak: 0.5 })
    this._tone({ type: 'square', freq: 494, at: 0.13, dur: 0.18, peak: 0.5 })
  }

  // UBike: bright bell ding (two detuned partials, fast decay).
  bell() {
    this._tone({ type: 'sine', freq: 2093, dur: 0.5, peak: 0.55 })
    this._tone({ type: 'sine', freq: 2637, dur: 0.35, peak: 0.3 })
    this._tone({ type: 'sine', freq: 2093 * 1.008, at: 0.09, dur: 0.45, peak: 0.35 })
  }

  // Low "thunk" when the vehicle bumps a wall.
  thunk() {
    this._tone({ type: 'triangle', freq: 82, dur: 0.13, peak: 0.6, glideTo: 46 })
  }

  // Soft rising blip when a project is discovered.
  visit() {
    this._tone({ type: 'triangle', freq: 660, dur: 0.12, peak: 0.35 })
    this._tone({ type: 'triangle', freq: 880, at: 0.1, dur: 0.2, peak: 0.4 })
  }

  // Little pentatonic fanfare for the all-visited celebration.
  fanfare() {
    const notes = [523, 587, 659, 784, 880, 1046]
    notes.forEach((f, i) => this._tone({ type: 'triangle', freq: f, at: i * 0.09, dur: 0.35, peak: 0.5 }))
    this._tone({ type: 'sine', freq: 1568, at: 0.55, dur: 0.7, peak: 0.35 })
  }
}
