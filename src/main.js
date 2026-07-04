import * as THREE from 'three'
import './styles.css'
import './ui/card.css'

import { Engine } from './core/Engine.js'
import { IsoCamera } from './core/Camera.js'
import { addLighting } from './core/Lighting.js'
import { DayNight } from './core/DayNight.js'
import { Post } from './core/Post.js'
import { buildWorld } from './world/World.js'
import { makeSky } from './world/factory/sky.js'
import { Fireworks } from './world/factory/fireworks.js'
import { makeCart } from './vehicle/Cart.js'
import { makeBike } from './vehicle/Bike.js'
import { CartController } from './vehicle/CartController.js'
import { Sound } from './core/Sound.js'
import { DriverSwitcher } from './character/Driver.js'
import { ProximitySystem } from './projects/ProximitySystem.js'
import { GuideArrow } from './projects/GuideArrow.js'
import { projects } from './projects/projects.data.js'
import { Hud } from './ui/Hud.js'
import { Minimap } from './ui/Minimap.js'
import { Loader } from './ui/Loader.js'
import { Intro } from './ui/Intro.js'
import { createKeyboard } from './input/Keyboard.js'
import { createTouchControls } from './input/TouchControls.js'

boot()

async function boot() {
  // QA/screenshot affordance: ?shot pins a static overview cam + hides UI.
  // ?shot=lm:<projectId> frames one landmark (append `,night` for night).
  const params = new URLSearchParams(location.search)
  const shot = params.has('shot')
  // accessibility: freeze ambient motion (traffic/peds/clouds/fountain/beacons)
  // for users who ask for reduced motion — driving stays user-controlled.
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!Engine.isWebGLAvailable()) {
    document.getElementById('loader')?.remove()
    const nw = document.getElementById('nowebgl'); if (nw) nw.hidden = false
    return
  }

  const loader = new Loader()
  loader.set('Warming up', 0.04)
  await frame()

  const engine = new Engine(document.getElementById('app'))
  const camera = new IsoCamera(window.innerWidth / window.innerHeight)
  engine.setCamera(camera.cam)

  const world = buildWorld((label, p) => loader.set(label, p))
  engine.scene.add(world.group)
  const lights = addLighting(engine.scene, { shadowSize: engine.shadowSize, half: world.half })

  // 3D sky dome (background) + post-processing pipeline (bloom + AO + grade)
  const sky = makeSky()
  engine.scene.add(sky.group)
  camera.cam.layers.enable(1) // the follow camera also sees the layer-1 sky dome
  // High tier gets the full composer (bloom + AO + grade). Low/mobile skips it
  // entirely — no HalfFloat target, no bloom mip chain — and renders direct.
  const post = engine.tier === 'low' ? null : new Post({ renderer: engine.renderer, scene: engine.scene, camera: camera.cam, tier: engine.tier })
  if (post) engine.onResize = (w, h) => post.setSize(w, h)

  // vehicles: kart + UBike, same scale so the rider reads identical on both.
  // Only the active one is visible; the controller swaps meshes in place.
  const kart = makeCart()
  kart.scale.setScalar(0.72)
  kart.userData.wheelR = 0.44 * 0.72 // world-space wheel radius (root is scaled)
  const bike = makeBike()
  bike.scale.setScalar(0.72)
  bike.userData.wheelR = 0.46 * 0.72
  engine.scene.add(kart, bike)
  let vehicleKind = (() => { try { return localStorage.getItem('city.vehicle') === 'bike' ? 'bike' : 'kart' } catch { return 'kart' } })()
  let cart = vehicleKind === 'bike' ? bike : kart // `cart` = the ACTIVE vehicle (reassigned on switch)
  ;(vehicleKind === 'bike' ? kart : bike).visible = false
  const driver = new DriverSwitcher(cart.userData.driverMount, 0)
  const controller = new CartController(cart, {
    bounds: world.bounds, obstacles: world.obstacles, spawn: world.spawn, preset: vehicleKind, reduced,
  })
  camera.snapTo(cart.position)
  const shotMode = shot ? (params.get('shot') || '') : ''
  const shotPlay = shotMode.includes('play') // keep the real follow-cam for gameplay-framing shots
  if (shot) {
    const overview = document.getElementById('overlay')
    if (overview) overview.style.display = 'none'
    const lm = shotMode.match(/lm:([\w-]+)/)?.[1]
    const lmP = lm && projects.find((p) => p.id === lm)
    if (shotPlay) { /* follow cam stays active */ }
    else if (lmP) {
      const [x, z] = lmP.pos
      const pb = world.projectBuildings.find((b) => b.project.id === lmP.id)
      const top = Math.max(6, (pb?.anchor.y ?? 8) + 2)
      camera.cam.position.set(x + 15, top * 0.9 + 6, z + 15)
      camera.cam.lookAt(x, top * 0.42, z)
    }
    else if (shotMode.includes('hero')) { camera.cam.position.set(17, 17, 27); camera.cam.lookAt(0, 4, -7) }
    else { camera.cam.position.set(72, 80, 72); camera.cam.lookAt(0, 3, 0) }
  }

  // UI overlay
  const overlay = document.getElementById('overlay')
  const seen = (() => { try { return localStorage.getItem('city.seen') === '1' } catch { return false } })()
  const intro = new Intro(overlay, { open: !seen && !shot })

  // ── visit tracking (persisted) + guide target ──
  const visited = new Set((() => {
    try { return JSON.parse(localStorage.getItem('city.visited') || '[]') } catch { return [] }
  })())
  let explicitTarget = null // tracker-dot click overrides the auto target
  const nearestUnvisited = () => {
    let best = null, bd = Infinity
    for (const b of world.projectBuildings) {
      if (visited.has(b.project.id)) continue
      const d = Math.hypot(cart.position.x - b.pos.x, cart.position.z - b.pos.y)
      if (d < bd) { bd = d; best = b }
    }
    return best
  }
  const byId = (id) => world.projectBuildings.find((b) => b.project.id === id)

  const sound = new Sound()
  let dayNight
  const switchVehicle = () => {
    vehicleKind = vehicleKind === 'bike' ? 'kart' : 'bike'
    const next = vehicleKind === 'bike' ? bike : kart
    const prev = vehicleKind === 'bike' ? kart : bike
    prev.visible = false
    next.visible = true
    cart = next
    controller.setVehicle(next, vehicleKind)
    driver.setMount(next.userData.driverMount)
    hud.setVehicleLabel(vehicleKind)
    hud.announce(vehicleKind === 'bike' ? 'Now riding the UBike' : 'Now driving the kart')
    try { localStorage.setItem('city.vehicle', vehicleKind) } catch { /* private mode */ }
  }
  const toggleTarget = (id) => { explicitTarget = (explicitTarget === id) ? null : id; syncTracker() }
  const hud = new Hud(overlay, {
    onSwitchDriver: () => { hud.setDriverLabel(driver.toggle().label); hud.announce(`Driver: ${driver.label}`) },
    onSwitchVehicle: switchVehicle,
    onHelp: () => intro.open(),
    onDayNight: () => { if (dayNight) dayNight.toggle() },
    onTrackerClick: toggleTarget,
    onTipClick: () => doAction(),
  })
  hud.setDriverLabel(driver.label)
  hud.setVehicleLabel(vehicleKind)
  hud.setTracker(projects)
  dayNight = new DayNight({
    scene: engine.scene, renderer: engine.renderer, lights,
    body: document.body, onLabel: (m) => hud.setDayNight(m),
  })
  hud.setDayNight('day')
  if (shot && shotMode.includes('night')) dayNight.setTo(1) // snap (virtual-time tween won't complete)
  const minimap = new Minimap(overlay, world.minimap, { onProjectClick: toggleTarget })
  const proximity = new ProximitySystem(world.projectBuildings)
  const guide = new GuideArrow(engine.scene)

  const currentTarget = () => (explicitTarget && byId(explicitTarget)) || nearestUnvisited()
  let lastTargetId = null
  const syncTracker = () => {
    const tgt = currentTarget()
    lastTargetId = tgt?.project.id ?? null
    hud.updateTracker(visited, lastTargetId)
    minimap.setState(visited, lastTargetId)
  }
  syncTracker()

  const fireworks = new Fireworks(engine.scene)
  const markVisited = (id) => {
    // clear an explicit guide target on engagement even for REVISITS —
    // otherwise the arrow keeps pointing at it forever after the card opens
    if (explicitTarget === id) { explicitTarget = null; syncTracker() }
    if (visited.has(id)) return
    visited.add(id)
    try { localStorage.setItem('city.visited', JSON.stringify([...visited])) } catch { /* private mode */ }
    syncTracker()
    const p = projects.find((x) => x.id === id)
    if (p) hud.announce(`Discovered ${p.title} at ${p.venue} — ${visited.size} of ${projects.length}`)
    if (visited.size === projects.length) {
      // the payoff moment: fireworks over the player + fanfare + toast
      if (!reduced) fireworks.show(cart.position.x, cart.position.z)
      sound.fanfare()
      hud.toast(`🎆 <b>All ${projects.length} landmarks visited!</b> Thanks for exploring — <a href="classic.html">see the classic portfolio ↗</a>`)
    } else {
      sound.visit()
    }
  }

  // input → shared state.
  // The action is a TOGGLE and visits are credited on ENGAGEMENT (card open),
  // not proximity — a drive-by no longer silently checks off the tracker.
  const input = { throttle: 0, steer: 0 }
  const doAction = () => {
    if (intro.visible) { intro.close(); return }
    if (hud.revealed) { hud.unreveal(); return }
    if (hud.reveal()) { markVisited(hud.active.id); return }
    // pressed T in the middle of nowhere → point at the arrow instead of silence
    const tgt = currentTarget()
    if (tgt) {
      hud.toast(`Follow the arrow → <b>${tgt.project.title}</b> · ${tgt.project.venue}`, 2600)
      guide.flash()
    }
  }
  let honkState = null // {x, z, t} on the world-animation clock (peds hop)
  const doHorn = () => {
    if (intro.visible) return
    if (vehicleKind === 'bike') sound.bell(); else sound.horn()
    // reduced-motion users still get the sound; the ped hop is skipped
    if (!reduced) honkState = { x: cart.position.x, z: cart.position.z, t: engine.clock.elapsedTime }
  }
  createKeyboard(input, {
    onAction: doAction,
    onVehicle: () => { if (!intro.visible) switchVehicle() },
    onHorn: doHorn,
    onDayNight: () => { if (dayNight && !intro.visible) dayNight.toggle() },
    onDismiss: () => hud.unreveal(),
  })
  if (window.matchMedia('(pointer:coarse)').matches) {
    createTouchControls(input, { onAction: doAction, onHorn: doHorn, container: overlay })
  }

  // ── adaptive quality: shed the AO pass, then DPR, if frame times sag ──
  let emaMs = 16.7, qStep = 0, qLast = 6
  const autoQuality = (dtMs, t) => {
    emaMs = emaMs * 0.96 + dtMs * 0.04
    if (t - qLast < 4 || t < 6) return
    if (qStep === 0 && emaMs > 26) {
      if (post?.ao) post.ao.enabled = false
      qStep = 1; qLast = t
    } else if (qStep === 1 && emaMs > 33) {
      // lower the DPR *cap* — a plain setPixelRatio was silently reverted by
      // the next resize (mobile URL-bar, rotation), exactly on the devices
      // that needed the downgrade
      engine.setDprCap(1.25)
      qStep = 2; qLast = t
    }
  }

  // render loop
  const ndc = new THREE.Vector3()
  const cartXZ = { x: 0, z: 0 } // reused every frame (no per-frame allocation)
  const mmState = { x: 0, z: 0, heading: 0 }
  let lastBump = -1
  let running = true
  let rafId = 0
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running = false; cancelAnimationFrame(rafId) }
    else if (!running) { running = true; engine.clock.getDelta(); rafId = requestAnimationFrame(loop) }
  })

  function loop() {
    if (!running) return
    rafId = requestAnimationFrame(loop)
    const dt = Math.min(engine.clock.getDelta(), 0.05)
    const t = engine.clock.elapsedTime

    const drive = intro.visible ? { throttle: 0, steer: 0 } : input
    controller.update(dt, drive)
    // collision feedback: audible thunk + camera jolt (debounced; motion-safe)
    if (controller.bumped && Math.abs(controller.speed) > 2.2 && t - lastBump > 0.35) {
      lastBump = t
      sound.thunk()
      if (!reduced) camera.shake(0.35)
    }
    if (!shot || shotPlay) camera.update(dt, cart.position, controller.heading, controller.speed, controller.bank)
    cartXZ.x = cart.position.x; cartXZ.z = cart.position.z
    const tAnim = reduced ? 6.0 : t // frozen ambient phase when reduced-motion
    world.animate(tAnim, dayNight.nightT, cartXZ, honkState)
    dayNight.update(dt)
    fireworks.update(dt)
    sky.setNight(dayNight.nightT); sky.animate(tAnim)
    if (post) post.setNight(dayNight.nightT)

    const active = proximity.update(cart.position)
    hud.setActive(active ? active.project : null)
    if (active) {
      ndc.copy(active.anchor).project(camera.cam)
      const onScreen = ndc.z < 1 && Math.abs(ndc.x) < 1.25 && Math.abs(ndc.y) < 1.25
      const x = (ndc.x * 0.5 + 0.5) * window.innerWidth
      const y = (-ndc.y * 0.5 + 0.5) * window.innerHeight
      hud.position(x, y, onScreen)
    }

    // guide arrow → current target (hidden while the intro is up or in shots)
    const tgt = currentTarget()
    const tgtId = tgt?.project.id ?? null
    if (tgtId !== lastTargetId) { lastTargetId = tgtId; hud.updateTracker(visited, tgtId); minimap.setState(visited, tgtId) }
    if (tgt) guide.setColor(tgt.project.accent)
    guide.update(dt, tAnim, cart.position, tgt ? { x: tgt.pos.x, z: tgt.pos.y } : null, intro.visible || shot || !!active)

    mmState.x = cart.position.x; mmState.z = cart.position.z; mmState.heading = controller.heading
    minimap.update(mmState, tAnim)
    autoQuality(dt * 1000, t)
    if (post) post.render() // EffectComposer: scene → AO → bloom → grade/vignette → tone-map
    else engine.render(camera.cam) // low tier: direct render (renderer tone-maps + sRGB)
  }

  loop()
  await loader.hide()

  if (import.meta.env.DEV) {
    window.__city = { controller, proximity, hud, camera, driver, world, kart, bike, input, dayNight, engine, visited, guide, switchVehicle, fireworks, get cart() { return cart } }
  }
}

function frame() { return new Promise((r) => requestAnimationFrame(() => r())) }
