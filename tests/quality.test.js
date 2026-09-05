import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { QUALITY, pixelRatio, AdaptiveQuality } from '../src/core/Quality.js'
import { paint, linColor, mergeStatic } from '../src/util/geo.js'
import { CartController } from '../src/vehicle/CartController.js'

test('4K and high-DPI windows stay inside the pixel budget after resizing', () => {
  for (const profile of Object.values(QUALITY)) for (const [w,h,dpr] of [[3840,2160,2],[1920,1080,2],[390,844,3],[1024,768,1]]) {
    const ratio = pixelRatio(w,h,dpr,profile)
    assert.ok(w*h*ratio*ratio <= profile.pixels + 0.01)
    assert.ok(ratio <= Math.min(profile.dpr,dpr))
  }
})
test('auto responds to sustained slow frames and reaches a real low-cost fallback', () => {
  const changes = [], q = new AdaptiveQuality(level => changes.push(level))
  for(let i=0;i<120;i++)q.sample(40)
  assert.deepEqual(changes,['low','minimal'])
  for(let i=0;i<1000;i++)q.sample(8)
  assert.equal(q.level,'minimal')
})
test('one stall does not drop quality; intentional pauses can reset the sample', () => {
  const q = new AdaptiveQuality(() => assert.fail('Unexpected downgrade'))
  q.sample(250)
  for(let i=0;i<300;i++)q.sample(16.7)
  q.sample(100);q.reset()
  assert.equal(q.frames,0)
  assert.equal(q.level,'balanced')
})
test('manual quality is respected and Auto can be re-enabled', () => {
  const q = new AdaptiveQuality(()=>{})
  q.select('high')
  for(let i=0;i<300;i++)q.sample(40)
  assert.equal(q.level,'high')
  q.select('auto');assert.equal(q.level,'balanced')
  q.select('invalid');assert.equal(q.mode,'auto')
})
test('vertex and instance colors match standard material CSS colors', () => {
  const expected = new THREE.Color('#8fa6b4')
  const geometry = paint(new THREE.BoxGeometry(), '#8fa6b4')
  const color = geometry.getAttribute('color')
  assert.ok(Math.abs(color.getX(0)-expected.r)<1e-6)
  assert.ok(Math.abs(color.getY(0)-expected.g)<1e-6)
  assert.ok(linColor('#8fa6b4').equals(expected))
})
test('merging supports indexed and already non-indexed geometry with transforms', () => {
  const root=new THREE.Group(), mat=new THREE.MeshStandardMaterial()
  const a=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),mat)
  const b=new THREE.Mesh(new THREE.BoxGeometry(2,2,2).toNonIndexed(),mat)
  a.position.x=-3;b.position.x=3;root.add(a,b)
  const merged=mergeStatic(root)
  const bounds=new THREE.Box3().setFromObject(merged)
  assert.equal(bounds.min.x,-4);assert.equal(bounds.max.x,4)
  let meshes=0;merged.traverse(o=>{if(o.isMesh)meshes++})
  assert.equal(meshes,1)
})
test('reset recovers a vehicle and clears momentum, steering and chassis lean', () => {
  const spawn={x:0,z:-8,heading:Math.PI}
  const c=new CartController(new THREE.Group(),{bounds:{min:-32,max:32},obstacles:[],spawn})
  for(let i=0;i<120;i++)c.update(1/60,{throttle:1,steer:.4})
  c.reset(spawn)
  assert.equal(c.speed,0);assert.equal(c.steerVis,0);assert.equal(c.bank,0)
  assert.equal(c.position.z,-8);assert.equal(c.heading,Math.PI)
})

test('road paint sits above the asphalt so markings do not z-fight', async () => {
  const { makeIslandRoads } = await import('../src/world/factory/roads.js')
  const road = makeIslandRoads()
  const asphalt = new THREE.Box3().setFromObject(road.children[1])
  const markings = new THREE.Box3().setFromObject(road.children[2])
  assert.ok(markings.min.y > asphalt.max.y + 0.01)
})
