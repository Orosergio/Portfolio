// The DOM overlay HUD: top bar (brand + buttons), the proximity tooltip,
// the project preview card (a real clickable link), and the visit tracker
// ("Projects 3/8" with one clickable dot per project → sets the guide arrow).
export class Hud {
  constructor(container, { onSwitchDriver, onSwitchVehicle, onHelp, onDayNight, onTrackerClick, onTipClick, onAutoCancel } = {}) {
    this.active = null
    this.revealed = false
    this.onTrackerClick = onTrackerClick

    const bar = document.createElement('div')
    bar.className = 'hud-bar'
    bar.innerHTML = `
      <div class="hud-brand"><span class="hud-mark"></span>Sergio Orozco<i>· Portfolio City</i></div>
      <div class="hud-actions">
        <button class="hud-btn" id="btnDayNight" aria-label="Toggle day or night" title="Day / Night (N)"><span id="dnIcon">☀</span></button>
        <button class="hud-btn" id="btnVehicle" aria-label="Switch vehicle" title="Switch vehicle (V)"><span id="vehIcon">🏎</span><span id="vehLabel">Kart</span></button>
        <button class="hud-btn" id="btnDriver" aria-label="Switch driver" title="Switch driver"><span class="dot"></span><span id="driverLabel">Driver</span></button>
        <button class="hud-btn" id="btnHelp" aria-label="Controls and help" title="Controls">?</button>
        <a class="hud-btn" id="btnClassic" href="classic.html" title="Classic portfolio">Classic ↗</a>
      </div>`
    container.appendChild(bar)
    bar.querySelector('#btnDriver').addEventListener('click', () => onSwitchDriver?.())
    bar.querySelector('#btnVehicle').addEventListener('click', () => onSwitchVehicle?.())
    bar.querySelector('#btnHelp').addEventListener('click', () => onHelp?.())
    this.btnDayNight = bar.querySelector('#btnDayNight')
    this.btnDayNight.setAttribute('aria-pressed', 'false')
    this.btnDayNight.addEventListener('click', () => onDayNight?.())
    this.driverLabel = bar.querySelector('#driverLabel')
    this.vehIcon = bar.querySelector('#vehIcon')
    this.vehLabel = bar.querySelector('#vehLabel')
    this.dnIcon = bar.querySelector('#dnIcon')

    // polite screen-reader announcements for game state (visit/vehicle/driver)
    const live = document.createElement('div')
    live.className = 'visually-hidden'
    live.setAttribute('aria-live', 'polite')
    live.setAttribute('role', 'status')
    container.appendChild(live)
    this.live = live

    // transient toast (celebration / hints)
    const toast = document.createElement('div')
    toast.className = 'hud-toast'
    toast.hidden = true
    container.appendChild(toast)
    this.toastEl = toast
    this._toastTimer = 0

    // autopilot pill — shows the destination while the vehicle self-drives
    const auto = document.createElement('div')
    auto.className = 'hud-auto'
    auto.hidden = true
    auto.innerHTML = `<span class="au-dot"></span><span id="autoLabel"></span><button id="autoCancel" aria-label="Cancel autopilot">✕</button>`
    container.appendChild(auto)
    this.autoEl = auto
    this.autoLabel = auto.querySelector('#autoLabel')
    auto.querySelector('#autoCancel').addEventListener('click', () => onAutoCancel?.())

    const tip = document.createElement('div')
    tip.className = 'hud-tip'
    tip.innerHTML = `<kbd>T</kbd> <span id="tipText">check preview</span>`
    tip.addEventListener('click', () => onTipClick?.()) // mouse users can click it too
    container.appendChild(tip)
    this.tip = tip
    this.tipText = tip.querySelector('#tipText')

    const card = document.createElement('div')
    card.className = 'hud-card-anchor'
    container.appendChild(card)
    this.cardAnchor = card

    // visit tracker
    const tracker = document.createElement('div')
    tracker.className = 'hud-tracker'
    container.appendChild(tracker)
    this.tracker = tracker
    this.trackerDots = new Map()

    this.hideAll()
  }

  setDriverLabel(label) { this.driverLabel.textContent = label }
  setVehicleLabel(kind) {
    const bike = kind === 'bike'
    this.vehIcon.textContent = bike ? '🚲' : '🏎'
    this.vehLabel.textContent = bike ? 'UBike' : 'Kart'
    const btn = this.vehIcon.closest('button')
    btn.setAttribute('aria-label', bike ? 'Switch to the kart' : 'Switch to the UBike')
  }
  setDayNight(mode) {
    this.dnIcon.textContent = mode === 'night' ? '🌙' : '☀'
    // toggle pattern: static label + aria-pressed state (a dynamic action label
    // PLUS pressed read as contradictory in screen readers)
    this.btnDayNight.setAttribute('aria-pressed', String(mode === 'night'))
    this.btnDayNight.setAttribute('aria-label', 'Night mode')
    if (this._dnInit) this.announce(mode === 'night' ? 'Night mode' : 'Day mode')
    this._dnInit = true
  }

  // Autopilot destination pill (null hides it).
  setAuto(project) {
    if (!project) { this.autoEl.hidden = true; return }
    this.autoLabel.innerHTML = `AUTO → <b>${project.title}</b> · ${project.venue} — take the wheel anytime`
    this.autoEl.hidden = false
  }

  // Screen-reader announcement (aria-live region, no visual).
  announce(text) { this.live.textContent = text }

  // Transient center-top toast; also announced to screen readers.
  toast(html, ms = 5200) {
    this.toastEl.innerHTML = html
    this.announce(this.toastEl.textContent)
    this.toastEl.hidden = false
    this.toastEl.classList.remove('show')
    void this.toastEl.offsetWidth // restart the pop animation
    this.toastEl.classList.add('show')
    clearTimeout(this._toastTimer)
    this._toastTimer = setTimeout(() => { this.toastEl.hidden = true }, ms)
  }

  // Build the tracker once from the project list. On touch only the word
  // "Projects" hides (.tr-word) — the count itself must survive on mobile.
  setTracker(projects) {
    this.tracker.innerHTML = `<span class="tr-label" id="trLabel"><span class="tr-word">Projects </span><b>0/${projects.length}</b></span><span class="tr-dots"></span>`
    this.trLabel = this.tracker.querySelector('#trLabel b')
    const dots = this.tracker.querySelector('.tr-dots')
    for (const p of projects) {
      const d = document.createElement('button')
      d.className = 'tr-dot'
      d.style.setProperty('--c', p.accent)
      d.title = `${p.title} — ${p.venue}`
      d.setAttribute('aria-label', `Guide me to ${p.title} at ${p.venue}`)
      d.addEventListener('click', () => this.onTrackerClick?.(p.id))
      dots.appendChild(d)
      this.trackerDots.set(p.id, d)
    }
  }

  // visited: Set<id> · targetId: the project the guide arrow points at
  updateTracker(visited, targetId) {
    this.trLabel.textContent = `${visited.size}/${this.trackerDots.size}`
    for (const [id, el] of this.trackerDots) {
      el.classList.toggle('done', visited.has(id))
      el.classList.toggle('target', id === targetId)
    }
  }

  setActive(project) {
    if (this.active === project) return
    this.active = project
    this.revealed = false
    this.cardAnchor.innerHTML = ''
    this._boxW = 0 // invalidate the cached tooltip/card measurement
    if (!project) { this.hideAll(); return }
    this.tipText.innerHTML = `${project.title} <i class="tip-venue">· ${project.venue}</i>`
    this.tip.style.display = 'flex'
    this.announce(`Near ${project.title} at ${project.venue}. Press T to preview.`)
  }

  // Returns true when a card was actually revealed (main credits the visit then).
  reveal() {
    if (!this.active || this.revealed) return false
    this.revealed = true
    this._boxW = 0
    this._lastX = null // tip/card share the position cache — force a re-write
    this.tip.style.display = 'none'
    const card = buildCard(this.active)
    this.cardAnchor.appendChild(card)
    // the anchor must be rendered BEFORE focus() — focusing inside a
    // display:none subtree is a silent no-op and Enter would close the card
    this.cardAnchor.style.display = 'block'
    // keyboard flow: T → focus lands on the card → Enter opens the link
    if (!card.hasAttribute('href')) card.setAttribute('tabindex', '-1')
    card.focus({ preventScroll: true })
    this.announce(`${this.active.title} preview open. ${this.active.href ? 'Press Enter to open the project.' : ''}`)
    return true
  }

  // Second T / Escape puts the card away and brings the tooltip back.
  unreveal() {
    if (!this.revealed) return
    this.revealed = false
    this._boxW = 0
    this._lastX = null
    this.cardAnchor.innerHTML = ''
    this.cardAnchor.style.display = 'none'
    if (this.active) this.tip.style.display = 'flex'
  }

  hideAll() {
    this.tip.style.display = 'none'
    this.cardAnchor.innerHTML = ''
    this.cardAnchor.style.display = 'none'
  }

  // Anchor whichever element is showing to a screen position, clamped so it
  // never clips off the viewport edges. Measures once per state change (the
  // old per-frame offsetWidth read forced a layout every frame near a landmark).
  position(x, y, onScreen) {
    const el = this.revealed ? this.cardAnchor : (this.active ? this.tip : null)
    if (!el) return
    if (!onScreen) {
      if (el.style.display !== 'none') { el.style.display = 'none'; this._lastX = null }
      return
    }
    el.style.display = this.revealed ? 'block' : 'flex'
    if (!this._boxW) {
      const box = this.revealed ? this.cardAnchor.firstElementChild : this.tip
      this._boxW = (box && box.offsetWidth) || 200
      this._boxH = (box && box.offsetHeight) || 44
    }
    const factor = this.revealed ? 1.08 : 1.35 // matches CSS translateY
    const cx = Math.round(Math.min(Math.max(x, 12 + this._boxW / 2), window.innerWidth - 12 - this._boxW / 2))
    const cy = Math.round(Math.max(y, 14 + this._boxH * factor))
    if (cx === this._lastX && cy === this._lastY) return
    this._lastX = cx; this._lastY = cy
    el.style.left = cx + 'px'
    el.style.top = cy + 'px'
  }
}

function buildCard(p) {
  const live = !!p.href
  const tag = `${p.category} · ${p.status}`
  const shot = p.screenshot
    ? `<img src="${p.screenshot}" alt="${p.title} screenshot" loading="lazy">`
    : `<div class="cover" style="--accent:${p.accent}"><span>${p.glyph}</span></div>`
  const cta = live
    ? `<span class="card-cta">${p.linkLabel} ↗</span>`
    : `<span class="card-cta muted">${p.linkLabel}</span>`

  const inner = `
    <div class="card-shot">${shot}</div>
    <div class="card-body">
      <div class="card-cat"><span>${tag}</span><span class="card-venue">📍 ${p.venue}</span></div>
      <div class="card-title">${p.title}</div>
      <div class="card-blurb">${p.blurb}</div>
      <div class="card-foot"><span class="card-stack">${p.stack}</span>${cta}</div>
    </div>`

  let el
  if (live) {
    el = document.createElement('a')
    el.href = p.href
    el.target = '_blank'
    el.rel = 'noopener noreferrer'
  } else {
    el = document.createElement('div')
  }
  el.className = 'hud-card' + (live ? '' : ' is-private')
  el.style.setProperty('--accent', p.accent)
  el.innerHTML = inner
  return el
}
