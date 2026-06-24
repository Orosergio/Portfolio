// The DOM overlay HUD: top bar (brand + buttons), the proximity tooltip,
// and the project preview card. The card is a real clickable link.
export class Hud {
  constructor(container, { onSwitchDriver, onHelp, onDayNight } = {}) {
    this.active = null
    this.revealed = false

    const bar = document.createElement('div')
    bar.className = 'hud-bar'
    bar.innerHTML = `
      <div class="hud-brand"><span class="hud-mark"></span>Sergio Orozco<i>· Portfolio City</i></div>
      <div class="hud-actions">
        <button class="hud-btn" id="btnDayNight" aria-label="Toggle day or night" title="Day / Night"><span id="dnIcon">☀</span></button>
        <button class="hud-btn" id="btnDriver" aria-label="Switch driver" title="Switch driver"><span class="dot"></span><span id="driverLabel" aria-live="polite">Driver</span></button>
        <button class="hud-btn" id="btnHelp" aria-label="Controls and help" title="Controls">?</button>
        <a class="hud-btn" id="btnClassic" href="classic.html" title="Classic portfolio">Classic ↗</a>
      </div>`
    container.appendChild(bar)
    bar.querySelector('#btnDriver').addEventListener('click', () => onSwitchDriver?.())
    bar.querySelector('#btnHelp').addEventListener('click', () => onHelp?.())
    this.btnDayNight = bar.querySelector('#btnDayNight')
    this.btnDayNight.setAttribute('aria-pressed', 'false')
    this.btnDayNight.addEventListener('click', () => onDayNight?.())
    this.driverLabel = bar.querySelector('#driverLabel')
    this.dnIcon = bar.querySelector('#dnIcon')

    const tip = document.createElement('div')
    tip.className = 'hud-tip'
    tip.innerHTML = `<kbd>T</kbd> <span id="tipText">check preview</span>`
    container.appendChild(tip)
    this.tip = tip
    this.tipText = tip.querySelector('#tipText')

    const card = document.createElement('div')
    card.className = 'hud-card-anchor'
    container.appendChild(card)
    this.cardAnchor = card

    this.hideAll()
  }

  setDriverLabel(label) { this.driverLabel.textContent = label }
  setDayNight(mode) {
    this.dnIcon.textContent = mode === 'night' ? '🌙' : '☀'
    this.btnDayNight.setAttribute('aria-pressed', String(mode === 'night'))
    this.btnDayNight.setAttribute('aria-label', mode === 'night' ? 'Switch to day' : 'Switch to night')
  }

  setActive(project) {
    if (this.active === project) return
    this.active = project
    this.revealed = false
    this.cardAnchor.innerHTML = ''
    if (!project) { this.hideAll(); return }
    this.tipText.textContent = `preview ${project.title}`
    this.tip.style.display = 'flex'
  }

  reveal() {
    if (!this.active || this.revealed) return
    this.revealed = true
    this.tip.style.display = 'none'
    this.cardAnchor.appendChild(buildCard(this.active))
  }

  hideAll() {
    this.tip.style.display = 'none'
    this.cardAnchor.innerHTML = ''
    this.cardAnchor.style.display = 'none'
  }

  // Anchor whichever element is showing to a screen position, clamped so it
  // never clips off the viewport edges.
  position(x, y, onScreen) {
    const el = this.revealed ? this.cardAnchor : (this.active ? this.tip : null)
    if (!el) return
    if (!onScreen) { el.style.display = 'none'; return }
    const box = this.revealed ? this.cardAnchor.firstElementChild : this.tip
    const w = box ? box.offsetWidth : 200
    const h = box ? box.offsetHeight : 44
    const factor = this.revealed ? 1.08 : 1.35 // matches CSS translateY
    const cx = Math.min(Math.max(x, 12 + w / 2), window.innerWidth - 12 - w / 2)
    const cy = Math.max(y, 14 + h * factor)
    el.style.display = this.revealed ? 'block' : 'flex'
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
      <div class="card-cat">${tag}</div>
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
