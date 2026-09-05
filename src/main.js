import * as THREE from 'three'
import './styles.css'
import './ui/card.css'

import { Engine } from './core/Engine.js'
import { IsoCamera } from './core/Camera.js'
import { addLighting } from './core/Lighting.js'
import { DayNight } from './core/DayNight.js'
import { AdaptiveQuality } from './core/Quality.js'
import { buildWorld } from './world/World.js'
import { makeSky } from './world/factory/sky.js'
import { Fireworks } from './world/factory/fireworks.js'
import { makeCart } from './vehicle/Cart.js'
import { makeBike } from './vehicle/Bike.js'
import { CartController } from './vehicle/CartController.js'
import { Autopilot } from './vehicle/Autopilot.js'
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

boot().catch((error) => {
  console.error('City could not start:', error)
  document.getElementById('loader')?.remove()
  document.getElementById('nowebgl').hidden = false
})

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

  // 3D sky dome; direct rendering by default, optional bloom loaded on demand.
  const sky = makeSky()
  engine.scene.add(sky.group)
  camera.cam.layers.enable(1) // the follow camera also sees the layer-1 sky dome
  // High tier gets the full composer (bloom + AO + grade). Low/mobile skips it
  // entirely — no HalfFloat target, no bloom mip chain — and renders direct.
  let post = null
  let needsRender = true
  let qualityRequest = 0
  const quality = new AdaptiveQuality(async (level) => {
    const request = ++qualityRequest
    post?.dispose()
    post = null
    engine.setQuality(level)
    needsRender = true
    if (level !== 'high') return
    try {
      // Optional bloom is downloaded only when the visitor asks for Detail.
      const { Post } = await import('./core/Post.js')
      if (request !== qualityRequest) return
      post = new Post({ renderer: engine.renderer, scene: engine.scene, camera: camera.cam })
      needsRender = true
    } catch (error) {
      console.warn('Detail unavailable; using direct rendering.', error)
      quality.select('auto')
      hud.setQuality('auto')
      hud.toast('Using automatic quality for this device.')
    }
  }, engine.tier)
  engine.onResize = (w, h) => { post?.setSize(w, h); camera.setAspect(w / h); needsRender = true }

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

  // UI overlay. ?goto=<projectId> deep-links straight into autopilot — skip the intro.
  const overlay = document.getElementById('overlay')
  const gotoId = params.get('goto')
  const gotoProject = gotoId ? projects.find((p) => p.id === gotoId) : null
  const seen = (() => { try { return localStorage.getItem('city.seen') === '1' } catch { return false } })()
  const intro = new Intro(overlay, { open: !seen && !shot && !gotoProject })

  // ── visit tracking (persisted) + guide target ──
  const visited = new Set((() => {
    try { const saved = JSON.parse(localStorage.getItem('city.visited') || '[]'); return Array.isArray(saved) ? saved.filter(id => projects.some(p => p.id === id)) : [] } catch { return [] }
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
  // ── autopilot: selecting a project drives you there; touching the
  // controls hands the wheel straight back ──
  // Under reduced-motion the traffic is frozen mid-street; feeding those
  // static cars to the follower would make it park behind scenery, so it
  // drives with no car-following (frozen cars are decor, not traffic).
  const autopilot = new Autopilot(reduced ? [] : world.trafficCars)
  const stopAuto = (announceText) => {
    if (!autopilot.active) return
    autopilot.cancel()
    hud.setAuto(null)
    if (announceText) hud.announce(announceText)
  }
  const toggleTarget = (id) => {
    if (hud.revealed) hud.unreveal()
    camera.setView('drive', cart.position, reduced)
    hud.setView('drive')
    needsRender = true
    // re-engage when tapping a dot whose autopilot already ended (arrived /
    // cancelled) — only a same-dot tap while ACTIVELY driving toggles it off
    const on = explicitTarget !== id || !autopilot.active
    explicitTarget = on ? id : null
    syncTracker()
    if (!on) { stopAuto('Autopilot off'); return }
    const b = byId(id)
    if (b && autopilot.engage(b.project, cart.position)) {
      hud.setAuto(b.project)
      hud.announce(`Autopilot engaged — driving to ${b.project.title} at ${b.project.venue}. Use the controls to take over.`)
    }
  }
  const hud = new Hud(overlay, {
    onSwitchDriver: () => { hud.setDriverLabel(driver.toggle().label); hud.announce(`Driver: ${driver.label}`) },
    onSwitchVehicle: switchVehicle,
    onHelp: () => intro.open(),
    onDayNight: () => { if (dayNight) dayNight.toggle() },
    onQuality: (mode) => { quality.select(mode); needsRender = true },
    onView: () => toggleView(),
    onReset: () => resetRide(),
    onTrackerClick: toggleTarget,
    onTipClick: () => doAction(),
    onAutoCancel: () => stopAuto('Autopilot off — you have the wheel'),
  })
  hud.setDriverLabel(driver.label)
  hud.setVehicleLabel(vehicleKind)
  hud.setTracker(projects)
  const toggleView = () => {
    const view = camera.view === 'overview' ? 'drive' : 'overview'
    camera.setView(view, cart.position, reduced)
    hud.setView(view)
    needsRender = true
  }
  const resetRide = () => {
    stopAuto()
    input.throttle = input.steer = 0
    keyboard.reset()
    controller.reset(world.spawn)
    camera.setView('drive', cart.position, true)
    hud.setView('drive')
    hud.unreveal()
    needsRender = true
    hud.announce('Back at the starting point.')
  }
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
  if (gotoProject) toggleTarget(gotoProject.id) // ?goto deep-link: drive there now

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
      hud.toast(`🎆 <b>All ${projects.length} landmarks visited!</b> Thanks for exploring — <a href="index.html">see the classic portfolio ↗</a>`)
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
  const keyboard = createKeyboard(input, {
    onAction: doAction,
    onVehicle: () => { if (!intro.visible) switchVehicle() },
    onHorn: doHorn,
    onReset: () => { if (!intro.visible) resetRide() },
    onView: () => { if (!intro.visible) toggleView() },
    onDayNight: () => { if (dayNight && !intro.visible) dayNight.toggle() },
    // Escape dismisses one layer per press (topmost first): an open card,
    // then autopilot. The intro closes itself; Keyboard skips Escape when the
    // intro already consumed it (defaultPrevented), so closing help never
    // cancels the drive.
    onDismiss: () => { if (hud.revealed) { hud.unreveal(); return } stopAuto('Autopilot off') },
  })
  if (window.matchMedia('(pointer:coarse)').matches) {
    createTouchControls(input, { onAction: doAction, onHorn: doHorn, container: overlay })
  }

  // render loop
  const ndc = new THREE.Vector3()
  const cartXZ = { x: 0, z: 0 } // reused every frame (no per-frame allocation)
  const mmState = { x: 0, z: 0, heading: 0 }
  const IDLE_DRIVE = { throttle: 0, steer: 0 }
  let lastBump = -1
  let running = true
  let rafId = 0
  let lastFrame = 0, lastRender = 0, lastShadow = -Infinity, lastMap = -Infinity, t = 0
  let wasPaused = false, wasDriving = false, lastScheduled = 0
  const stats = { frames: 0, frameMs: 0, draws: 0, triangles: 0 }
  // Pause completely behind cards/help. DOM interactions and resize invalidate.
  overlay.addEventListener('click', () => { needsRender = true })
  window.addEventListener('keydown', () => { needsRender = true })
  engine.renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault()
    running = false
    cancelAnimationFrame(rafId)
    document.getElementById('nowebgl').hidden = false
  })
  engine.renderer.domElement.addEventListener('webglcontextrestored', () => location.reload())
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running = false; cancelAnimationFrame(rafId) }
    else if (!running && !engine.renderer.getContext().isContextLost()) {
      running = true; lastFrame = lastRender = 0; needsRender = true
      quality.reset(); rafId = requestAnimationFrame(loop)
    }
  })

  function loop(now) {
    if (!running) return
    rafId = requestAnimationFrame(loop)
    const frameMs = lastFrame ? now - lastFrame : 16.7
    lastFrame = now
    const paused = intro.visible || hud.revealed
    const driving = !paused && (autopilot.active || Math.abs(controller.speed) > 0.1 || input.throttle || input.steer)
    const transitioning = dayNight.nightT !== dayNight.target
    if (driving && wasDriving) quality.sample(frameMs)
    else quality.reset()
    if (!!driving !== wasDriving) lastScheduled = 0
    wasDriving = !!driving
    if (paused !== wasPaused) { needsRender = true; wasPaused = paused; keyboard.reset() }
    // 60 Hz when interacting; 30 Hz ambient. Hidden tabs do no work at all.
    const interval = driving || transitioning ? 1000 / 60 : 1000 / 30
    if (!needsRender && ((paused && !transitioning) || now - lastScheduled < interval - 1)) return
    const dt = Math.min(lastRender ? (now - lastRender) / 1000 : 1 / 60, 0.05)
    lastRender = now
    lastScheduled = now - ((now - lastScheduled) % interval)
    needsRender = false
    if (!paused) t += dt
    engine.clock.elapsedTime = t

    // manual input hands the wheel back instantly (guide target stays set).
    // Gated on the intro: while it's up the input drives nothing (below), so a
    // stray key behind the help overlay must not silently cancel the drive.
    if (autopilot.active && !paused && (Math.abs(input.throttle) > 0.15 || Math.abs(input.steer) > 0.15)) {
      stopAuto('Manual control — autopilot off')
    }
    const auto = autopilot.active && !paused ? autopilot.update(dt, controller) : null
    const drive = paused ? IDLE_DRIVE : (auto || input)
    if (!paused) controller.update(dt, drive)
    if (autopilot.arrived) {
      autopilot.arrived = false
      const arrivedAt = autopilot.project
      autopilot.project = null
      hud.setAuto(null)
      // skip the "press T" prompt if the card is already open or the project
      // was opened on approach — it would tell the user to close their own
      // card, and would clobber the one-time all-8 celebration toast
      if (arrivedAt && !visited.has(arrivedAt.id) && !hud.revealed) {
        hud.announce(`Arrived at ${arrivedAt.venue}. Press T to open ${arrivedAt.title}.`)
        hud.toast(`Arrived at <b>${arrivedAt.venue}</b> — press T to open the project`, 3400)
      }
    }
    // Collision feedback without shaking the camera.
    if (controller.bumped && Math.abs(controller.speed) > 2.2 && t - lastBump > 0.35) {
      lastBump = t
      sound.thunk()
    }
    if ((!shot || shotPlay) && !paused) camera.update(dt, cart.position, controller.heading, controller.speed, controller.bank)
    cartXZ.x = cart.position.x; cartXZ.z = cart.position.z
    const tAnim = reduced ? 6.0 : t // frozen ambient phase when reduced-motion
    world.animate(tAnim, dayNight.nightT, cartXZ, honkState)
    dayNight.update(dt)
    if (!paused) fireworks.update(dt)
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
    if (now - lastMap > 100 || paused) { minimap.update(mmState, tAnim); lastMap = now }
    if (engine.profile.shadows && now - lastShadow >= 1000 / engine.profile.shadowHz) {
      engine.renderer.shadowMap.needsUpdate = true
      lastShadow = now
    }
    engine.renderer.info.reset()
    if (post) post.render() // opt-in bloom → tone-map
    else engine.render(camera.cam) // low tier: direct render (renderer tone-maps + sRGB)
    stats.frames++
    stats.frameMs = frameMs
    stats.draws = engine.renderer.info.render.calls
    stats.triangles = engine.renderer.info.render.triangles
  }

  loader.set('Preparing the first view', 0.98)
  await frame()
  await engine.renderer.compileAsync(engine.scene, camera.cam)
  loop(performance.now())
  await loader.hide()

  if (import.meta.env.DEV) {
    window.__city = { controller, proximity, hud, camera, driver, world, kart, bike, input, dayNight, engine, visited, guide, switchVehicle, fireworks, autopilot, toggleTarget, quality, stats, resetRide, get post() { return post }, get cart() { return cart } }
  }
}

function frame() { return new Promise((r) => requestAnimationFrame(() => r())) }
