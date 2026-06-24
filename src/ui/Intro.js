// First-run help overlay (controls + character toggle hint). Dismissible,
// remembered via localStorage. Reopened by the HUD "?" button.
export class Intro {
  constructor(container, { open = true } = {}) {
    const coarse = window.matchMedia('(pointer:coarse)').matches
    const el = document.createElement('div')
    el.className = 'intro'
    el.innerHTML = `
      <div class="intro-card">
        <div class="intro-kicker">Welcome to the city</div>
        <h2>Drive around to explore my work</h2>
        <p>Every glowing building is a project. Pull up close and a tooltip appears — trigger it to pop a preview you can click through to the repo or the live app.</p>
        <div class="intro-rows">
          ${coarse
            ? `<div class="intro-row"><span class="ic">🕹️</span><div><b>Joystick</b><small>drive the cart</small></div></div>
               <div class="intro-row"><span class="ic key">T</span><div><b>Action button</b><small>open a project preview</small></div></div>`
            : `<div class="intro-row"><span class="ic">↑ ↓ ← →</span><div><b>Arrows / WASD</b><small>drive the cart</small></div></div>
               <div class="intro-row"><span class="ic key">T</span><div><b>Press T</b><small>open a project preview</small></div></div>`}
          <div class="intro-row"><span class="ic">◐</span><div><b>Switch driver</b><small>top-right button — Mara / Leo</small></div></div>
        </div>
        <button class="intro-start" id="introStart">Start driving →</button>
        <a class="intro-classic" href="classic.html">Prefer a classic page? View the text portfolio →</a>
      </div>`
    container.appendChild(el)
    this.el = el
    this.visible = open
    if (!open) el.classList.add('hide')
    el.querySelector('#introStart').addEventListener('click', () => this.close())
  }
  close() {
    if (!this.visible) return
    this.visible = false
    this.el.classList.add('hide')
    try { localStorage.setItem('city.seen', '1') } catch (e) { /* private mode */ }
  }
  open() { this.visible = true; this.el.classList.remove('hide') }
}
