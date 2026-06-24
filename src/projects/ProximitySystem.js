// Finds the active project building near the cart, with enter/exit hysteresis
// so the tooltip/card don't flicker at the boundary.
export class ProximitySystem {
  constructor(projectBuildings, { enter = 7, exit = 9.5 } = {}) {
    this.items = projectBuildings
    this.enter = enter
    this.exit = exit
    this.current = null
  }

  // cartPos: THREE.Vector3 (uses x and z). item.pos: THREE.Vector2 (x, z).
  update(cartPos) {
    // drop the current one only once the cart is clearly away (exit radius)
    if (this.current) {
      const c = this.current
      const cd = Math.hypot(cartPos.x - c.pos.x, cartPos.z - c.pos.y)
      if (cd > this.exit) this.current = null
    }
    if (!this.current) {
      let nearest = null, nd = Infinity
      for (const it of this.items) {
        const d = Math.hypot(cartPos.x - it.pos.x, cartPos.z - it.pos.y)
        if (d < nd) { nd = d; nearest = it }
      }
      if (nearest && nd < this.enter) this.current = nearest
    }
    return this.current
  }
}
