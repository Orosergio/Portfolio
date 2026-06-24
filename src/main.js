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
import { makeCart } from './vehicle/Cart.js'
import { CartController } from './vehicle/CartController.js'
import { DriverSwitcher } from './character/Driver.js'
import { ProximitySystem } from './projects/ProximitySystem.js'
import { Hud } from './ui/Hud.js'
import { Minimap } from './ui/Minimap.js'
import { Loader } from './ui/Loader.js'
import { Intro } from './ui/Intro.js'
import { createKeyboard } from './input/Keyboard.js'
import { createTouchControls } from './input/TouchControls.js'

boot()

async function boot() {
  // QA/screenshot affordance: ?shot pins a static overview cam + hides UI.
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

  // cart + driver (scaled down so it never blocks the view)
  const cart = makeCart()
  cart.scale.setScalar(0.72)
  engine.scene.add(cart)
  const driver = new DriverSwitcher(cart.userData.driverMount, 0)
  const controller = new CartController(cart, {
    bounds: world.bounds, obstacles: world.obstacles, spawn: world.spawn,
  })
  camera.snapTo(cart.position)
  const shotMode = shot ? (params.get('shot') || '') : ''
  const shotPlay = shotMode.includes('play') // keep the real follow-cam for gameplay-framing shots
  if (shot) {
    const overview = document.getElementById('overlay')
    if (overview) overview.style.display = 'none'
    if (shotPlay) { /* follow cam stays active */ }
    else if (shotMode.includes('hero')) { camera.cam.position.set(17, 17, 27); camera.cam.lookAt(0, 4, -7) }
    else { camera.cam.position.set(56, 64, 56); camera.cam.lookAt(0, 3, 0) }
  }

  // UI overlay
  const overlay = document.getElementById('overlay')
  const seen = (() => { try { return localStorage.getItem('city.seen') === '1' } catch { return false } })()
  const intro = new Intro(overlay, { open: !seen && !shot })
  let dayNight
  const hud = new Hud(overlay, {
    onSwitchDriver: () => hud.setDriverLabel(driver.toggle().label),
    onHelp: () => intro.open(),
    onDayNight: () => { if (dayNight) dayNight.toggle() },
  })
  hud.setDriverLabel(driver.label)
  dayNight = new DayNight({
    scene: engine.scene, renderer: engine.renderer, lights,
    body: document.body, onLabel: (m) => hud.setDayNight(m),
  })
  hud.setDayNight('day')
  if (shot && shotMode.includes('night')) dayNight.setTo(1) // snap (virtual-time tween won't complete)
  const minimap = new Minimap(overlay, world.minimap)
  const proximity = new ProximitySystem(world.projectBuildings)

  // input → shared state
  const input = { throttle: 0, steer: 0 }
  const doAction = () => { if (intro.visible) intro.close(); else hud.reveal() }
  createKeyboard(input, { onAction: doAction })
  if (window.matchMedia('(pointer:coarse)').matches) {
    createTouchControls(input, { onAction: doAction, container: overlay })
  }

  // render loop
  const ndc = new THREE.Vector3()
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
    if (!shot || shotPlay) camera.update(dt, cart.position, controller.heading, controller.speed, controller.bank)
    world.animate(reduced ? 6.0 : t, dayNight.nightT) // frozen phase when reduced-motion
    dayNight.update(dt)
    sky.setNight(dayNight.nightT); sky.animate(t)
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

    minimap.update({ x: cart.position.x, z: cart.position.z, heading: controller.heading })
    if (post) post.render() // EffectComposer: scene → AO → bloom → grade/vignette → tone-map
    else engine.render(camera.cam) // low tier: direct render (renderer tone-maps + sRGB)
  }

  loop()
  await loader.hide()

  if (import.meta.env.DEV) {
    window.__city = { controller, proximity, hud, camera, driver, world, cart, input, dayNight, engine }
  }
}

function frame() { return new Promise((r) => requestAnimationFrame(() => r())) }
