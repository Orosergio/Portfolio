// Finds the active project landmark near the cart, with enter/exit hysteresis
// so the tooltip/card don't flicker at the boundary. Each item can carry its
// own `enter` radius (big landmarks like the stadium need a wider trigger).
export class ProximitySystem {
  constructor(projectBuildings, { enter = 7, exitPad = 2.5 } = {}) {
    this.items = projectBuildings
    this.enter = enter
    this.exitPad = exitPad
    this.current = null
  }

  // cartPos: THREE.Vector3 (uses x and z). item.pos: THREE.Vector2 (x, z).
  update(cartPos) {
    // drop the current one only once the cart is clearly away (exit radius)
    if (this.current) {
      const c = this.current
      const cd = Math.hypot(cartPos.x - c.pos.x, cartPos.z - c.pos.y)
      const enter = c.enter || this.enter
      if (cd > enter + this.exitPad) this.current = null
      else if (cd > enter) {
        // hysteresis band: hand off if a NEIGHBOR actively claims the cart.
        // Without this, close pairs (Skytree exit radius 10.5 vs Akihabara
        // 10.3u away) could hold `current` forever and open the wrong card.
        const n = this._nearest(cartPos)
        if (n && n.item !== c && n.nd < 1) this.current = n.item
      }
    }
    if (!this.current) {
      const n = this._nearest(cartPos)
      if (n && n.nd < 1) this.current = n.item
    }
    return this.current
  }

  // Closest landmark by distance normalized to each one's enter radius.
  _nearest(cartPos) {
    let item = null, nd = Infinity
    for (const it of this.items) {
      const d = Math.hypot(cartPos.x - it.pos.x, cartPos.z - it.pos.y) / (it.enter || this.enter)
      if (d < nd) { nd = d; item = it }
    }
    return item ? { item, nd } : null
  }
}
