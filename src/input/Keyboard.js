// Keyboard → shared input state. Arrows/WASD drive; T fires the action once.
export function createKeyboard(state, { onAction } = {}) {
  const keys = new Set()
  const recompute = () => {
    let t = 0, s = 0
    if (keys.has('arrowup') || keys.has('w')) t += 1
    if (keys.has('arrowdown') || keys.has('s')) t -= 1
    if (keys.has('arrowleft') || keys.has('a')) s -= 1
    if (keys.has('arrowright') || keys.has('d')) s += 1
    state.throttle = t; state.steer = s
  }
  const down = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return // don't poison the Set with OS/browser chords
    const t = e.target
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return
    const k = e.key.toLowerCase()
    if (k === 't' && !e.repeat) onAction?.()
    keys.add(k); recompute()
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault()
  }
  const up = (e) => { keys.delete(e.key.toLowerCase()); recompute() }
  const reset = () => { keys.clear(); recompute() }
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  window.addEventListener('blur', reset)
  return { dispose() { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', reset) } }
}
