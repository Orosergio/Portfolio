// Keyboard → shared input state. Arrows/WASD drive; T/E/Enter/Space fire the
// action; V swaps kart↔UBike; B honks/rings; N toggles day/night; Esc dismisses.
export function createKeyboard(state, { onAction, onVehicle, onHorn, onDayNight, onDismiss } = {}) {
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
    // let focused buttons/links keep their native Enter/Space activation
    const onWidget = t && /^(button|a)$/i.test(t.tagName)
    if (!e.repeat) {
      if (k === 't' || (!onWidget && (k === 'e' || k === 'enter' || k === ' '))) onAction?.()
      else if (k === 'v') onVehicle?.()
      else if (k === 'b') onHorn?.()
      else if (k === 'n') onDayNight?.()
      // the intro dialog registers its keydown first and preventDefaults the
      // Escape that closes it — don't also fire onDismiss (which would cancel
      // an autopilot running behind the help overlay)
      else if (k === 'escape' && !e.defaultPrevented) onDismiss?.()
    }
    keys.add(k); recompute()
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k) || (k === ' ' && !onWidget)) e.preventDefault()
  }
  const up = (e) => { keys.delete(e.key.toLowerCase()); recompute() }
  const reset = () => { keys.clear(); recompute() }
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  window.addEventListener('blur', reset)
  return { dispose() { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', reset) } }
}
