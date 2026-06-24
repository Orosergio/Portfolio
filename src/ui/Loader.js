// Drives the inline #loader overlay (paints before the module boots).
export class Loader {
  constructor() {
    this.el = document.getElementById('loader')
    this.fill = document.getElementById('ld-fill')
    this.meta = document.getElementById('ld-meta')
    this._p = 0
  }
  set(label, p) {
    this._p = Math.max(this._p, p)
    if (label && this.meta) this.meta.textContent = label
    if (this.fill) this.fill.style.width = Math.round(this._p * 100) + '%'
  }
  async hide() {
    this.set('Ready', 1)
    await new Promise((r) => setTimeout(r, 280))
    this.el?.classList.add('hide')
    await new Promise((r) => setTimeout(r, 650))
    this.el?.remove()
  }
}
