// Small math helpers — frame-rate-independent damping is the important one.

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)
export const lerp = (a, b, t) => a + (b - a) * t

// Exponential (critically-damped-ish) smoothing that is stable at any dt.
// lambda ~ how fast it converges (higher = snappier). dt in seconds.
export const damp = (current, target, lambda, dt) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt))

// Damp a THREE.Vector3 in place toward target.
export function dampVec3(out, target, lambda, dt) {
  const k = 1 - Math.exp(-lambda * dt)
  out.x += (target.x - out.x) * k
  out.y += (target.y - out.y) * k
  out.z += (target.z - out.z) * k
  return out
}

export const rand = (a, b) => a + Math.random() * (b - a)
export const pick = (arr) => arr[(Math.random() * arr.length) | 0]
export const TAU = Math.PI * 2
