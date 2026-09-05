// Pixel budgets also protect large desktop/4K windows, where a DPR cap alone
// still allocates millions of fragments per pass. Auto starts with direct render.
export const QUALITY = {
  high: { dpr: 1.5, pixels: 2_000_000, shadows: true, shadowHz: 20, post: true },
  balanced: { dpr: 1.25, pixels: 1_500_000, shadows: true, shadowHz: 15, post: false },
  low: { dpr: 1, pixels: 900_000, shadows: false, shadowHz: 0, post: false },
  minimal: { dpr: 0.75, pixels: 500_000, shadows: false, shadowHz: 0, post: false },
}

export function pixelRatio(width, height, deviceDpr, profile) {
  return Math.min(deviceDpr || 1, profile.dpr, Math.sqrt(profile.pixels / Math.max(1, width * height)))
}

export class AdaptiveQuality {
  constructor(onChange, initial = 'balanced') {
    this.onChange = onChange
    this.initial = initial
    this.mode = 'auto'
    this.level = initial
    this.reset()
  }
  reset() { this.elapsed = 0; this.frames = 0; this.slow = 0 }
  select(mode) {
    this.mode = ['auto', 'high', 'low'].includes(mode) ? mode : 'auto'
    this.level = this.mode === 'auto' ? this.initial : this.mode
    this.reset()
    this.onChange(this.level)
  }
  // Only sample active, unthrottled frames. Time comes from rAF BEFORE the
  // physics clamp; otherwise very slow frames were reported as just 50 ms.
  sample(ms) {
    if (this.mode !== 'auto' || !Number.isFinite(ms) || ms <= 0) return
    this.elapsed += ms
    this.frames++
    if (ms > 24) this.slow++
    if (this.elapsed < 1800 || this.frames < 12) return
    if (this.slow / this.frames > 0.35) {
      const next = { balanced: 'low', low: 'minimal' }[this.level]
      if (next) { this.level = next; this.onChange(next) }
    }
    // No automatic upgrades in the same session: avoids quality oscillation.
    this.reset()
  }
}
