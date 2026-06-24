import { clamp } from '../util/math.js'

// On-screen analog joystick (drive) + action button (mirrors the T key),
// both feeding the SAME shared input state the keyboard writes to.
export function createTouchControls(state, { onAction, container } = {}) {
  const root = document.createElement('div')
  root.className = 'touch'
  root.innerHTML = `
    <div class="joy" id="joyBase"><div class="joy-knob" id="joyKnob"></div></div>
    <button class="act-btn" id="actBtn" aria-label="Open project preview">T</button>`
  container.appendChild(root)

  const base = root.querySelector('#joyBase')
  const knob = root.querySelector('#joyKnob')
  const btn = root.querySelector('#actBtn')
  let active = null, cx = 0, cy = 0
  const R = 48

  const reset = () => {
    active = null
    knob.style.transform = 'translate(0,0)'
    state.steer = 0; state.throttle = 0
  }
  const start = (e) => {
    if (active !== null) return // ignore extra fingers while one drives
    active = e.pointerId
    const r = base.getBoundingClientRect()
    cx = r.left + r.width / 2; cy = r.top + r.height / 2
    try { base.setPointerCapture(e.pointerId) } catch (err) { /* unsupported */ }
    move(e)
  }
  const move = (e) => {
    if (active !== e.pointerId) return
    const dx = e.clientX - cx, dy = e.clientY - cy
    const d = Math.hypot(dx, dy) || 1
    const m = Math.min(d, R)
    const kx = (dx / d) * m, ky = (dy / d) * m
    knob.style.transform = `translate(${kx}px,${ky}px)`
    state.steer = clamp(kx / R, -1, 1)
    state.throttle = clamp(-ky / R, -1, 1)
  }
  // Reset only for the tracked pointer — so a release anywhere (or lost capture)
  // can never leave the throttle stuck.
  const end = (e) => { if (active === null) return; if (e.pointerId != null && e.pointerId !== active) return; reset() }

  base.addEventListener('pointerdown', start)
  base.addEventListener('pointermove', move)
  base.addEventListener('pointerup', end)
  base.addEventListener('pointercancel', end)
  base.addEventListener('lostpointercapture', end)
  window.addEventListener('pointerup', end)
  window.addEventListener('pointercancel', end)

  const fire = (e) => { e.preventDefault(); onAction?.() }
  btn.addEventListener('pointerup', fire)

  return {
    root,
    dispose() {
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      root.remove()
    },
  }
}
