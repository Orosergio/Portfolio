// First-run help overlay (controls + character toggle hint). Dismissible,
// remembered via localStorage. Reopened by the HUD "?" button.
// Proper dialog semantics: role=dialog + focus moves in on open, returns to
// the previously-focused element on close, Escape dismisses, Tab is trapped.
export class Intro {
  constructor(container, { open = true } = {}) {
    const coarse = window.matchMedia('(pointer:coarse)').matches
    const el = document.createElement('div')
    el.className = 'intro'
    el.setAttribute('role', 'dialog')
    el.setAttribute('aria-modal', 'true')
    el.setAttribute('aria-labelledby', 'introTitle')
    el.innerHTML = `
      <div class="intro-card">
        <div class="intro-kicker">Welcome to Portfolio City</div>
        <h2 id="introTitle">8 projects live inside 8 landmarks of Japan&nbsp;&amp;&nbsp;Taiwan</h2>
        <p>Tokyo Tower, Taipei 101, the Raohe night market… each icon hosts one real project. Follow the <b>glowing arrow</b> to the nearest one — the name floats above it — and pull up close to preview and open it.</p>
        <div class="intro-rows">
          ${coarse
            ? `<div class="intro-row"><span class="ic">🕹️</span><div><b>Joystick</b><small>drive around the island</small></div></div>
               <div class="intro-row"><span class="ic key">T</span><div><b>Action button</b><small>open the project at a landmark</small></div></div>
               <div class="intro-row"><span class="ic">🚲</span><div><b>Kart or UBike</b><small>top bar swaps your ride · 🔔 rings the bell</small></div></div>
               <div class="intro-row"><span class="ic">☀→🌙</span><div><b>Try night mode</b><small>top bar — lanterns, neon and beacons light up</small></div></div>`
            : `<div class="intro-row"><span class="ic">↑ ↓ ← →</span><div><b>Arrows / WASD</b><small>drive around the island</small></div></div>
               <div class="intro-row"><span class="ic key">T</span><div><b>Press T</b><small>open the project at a landmark</small></div></div>
               <div class="intro-row"><span class="ic key">V · B</span><div><b>Kart or UBike</b><small>V swaps your ride · B honks the horn / rings the bell</small></div></div>
               <div class="intro-row"><span class="ic key">N</span><div><b>Try night mode</b><small>lanterns, neon and beacons light up</small></div></div>`}
          <div class="intro-row"><span class="ic">◎</span><div><b>Visit tracker</b><small>bottom-right — tap a dot and the arrow guides you there</small></div></div>
        </div>
        <button class="intro-start" id="introStart">Start driving →</button>
        <a class="intro-classic" href="classic.html">Prefer a classic page? View the text portfolio →</a>
      </div>`
    container.appendChild(el)
    this.el = el
    this.visible = open
    this._restoreFocus = null
    if (!open) el.classList.add('hide')
    el.querySelector('#introStart').addEventListener('click', () => this.close())
    // window-level: Escape/Tab must work even after a backdrop click moves
    // focus to <body> (a listener on the dialog would go silent then)
    window.addEventListener('keydown', (e) => {
      if (!this.visible) return
      if (e.key === 'Escape') { e.preventDefault(); this.close(); return }
      if (e.key === 'Tab') { // trap: cycle between the two focusables
        const focusables = [el.querySelector('#introStart'), el.querySelector('.intro-classic')]
        const i = focusables.indexOf(document.activeElement)
        const next = e.shiftKey ? (i <= 0 ? focusables.length - 1 : i - 1) : (i >= focusables.length - 1 ? 0 : i + 1)
        e.preventDefault()
        focusables[next].focus()
      }
    })
    if (open) queueMicrotask(() => el.querySelector('#introStart')?.focus())
  }
  close() {
    if (!this.visible) return
    this.visible = false
    this.el.classList.add('hide')
    try { localStorage.setItem('city.seen', '1') } catch (e) { /* private mode */ }
    this._restoreFocus?.focus?.()
    this._restoreFocus = null
  }
  open() {
    this.visible = true
    this._restoreFocus = document.activeElement
    this.el.classList.remove('hide')
    queueMicrotask(() => this.el.querySelector('#introStart')?.focus())
  }
}
