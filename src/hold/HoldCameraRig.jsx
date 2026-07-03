import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { holdState } from './holdState'

// ─── Camera path ───────────────────────────────────────────────────────────
// The two beats this scaffold exists to pressure-test:
//   1. The pull-back — opener (tight on the hero crate) → crane up and back so
//      one crate is revealed to be a facility of hundreds. Slow and weighty: a
//      *motivated* crane, not a tech-demo swoop. (The Signal's "person walking"
//      rule is its own contract; The Hold earns its single crane move.)
//   2. The release — handing off from camera-scroll to a readable document.
//
// Scroll fraction t maps roughly to:
//   0.00–0.15  opener hold (a breath on the hero crate)
//   0.15–0.42  the pull-back / reveal
//   0.42–1.00  descend into the aisle and glide
const PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.0, 1.30, 4.7),    // opener — eye level, close
  new THREE.Vector3(0.1, 1.46, 5.2),    // settle / breath
  new THREE.Vector3(0.4, 3.30, 8.6),    // crane begins
  new THREE.Vector3(0.7, 7.60, 15.6),   // the reveal — high and back
  new THREE.Vector3(0.6, 5.40, 11.4),   // tip down into the aisle
  new THREE.Vector3(0.2, 3.20, 5.4),    // descending
  new THREE.Vector3(0.0, 2.56, -2.2),   // aisle mouth
  new THREE.Vector3(0.0, 2.50, -14.0),  // gliding
  new THREE.Vector3(0.0, 2.48, -28.0),  // deeper
  new THREE.Vector3(0.0, 2.46, -40.0),  // far end
])

// Where the gaze rests, sampled by the same t. Opener looks at the hero crate;
// the crane lifts the gaze onto the rack; the glide looks ahead down the aisle.
const LOOK = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.0, 1.00, 0.0),    // the hero crate
  new THREE.Vector3(0.0, 1.05, -0.6),
  new THREE.Vector3(0.0, 1.85, -4.0),   // tilt up as we crane
  new THREE.Vector3(0.0, 2.20, -10.0),  // the rack laid out ahead/below
  new THREE.Vector3(0.0, 2.30, -16.0),
  new THREE.Vector3(0.0, 2.40, -24.0),
  new THREE.Vector3(0.0, 2.40, -34.0),  // ahead, down the aisle
  new THREE.Vector3(0.0, 2.40, -46.0),
  new THREE.Vector3(0.0, 2.40, -58.0),
  new THREE.Vector3(0.0, 2.40, -70.0),
])

function smoothstep(x) { return x * x * (3 - 2 * x) }

export function HoldCameraRig() {
  const { camera } = useThree()

  const pos   = useRef(PATH.getPoint(0).clone())
  const look  = useRef(LOOK.getPoint(0).clone())
  const tPos  = useRef(new THREE.Vector3())
  const tLook = useRef(new THREE.Vector3())
  const gap   = useRef(new THREE.Vector3())

  useEffect(() => {
    // Native scroll → progress (same approach as CameraRig: reliable on
    // wheel, trackpad and touch). The rig damps it to `smooth`.
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (max > 0) holdState.progress = Math.min(window.scrollY / max, 1)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime
    const dt   = Math.min(delta, 0.05)

    holdState.smooth = THREE.MathUtils.damp(holdState.smooth, holdState.progress, 2.0, dt)
    const t = holdState.smooth
    const r = holdState.releaseProgress
    const er = smoothstep(r)

    // Facility pose from the paths
    PATH.getPoint(Math.min(t, 1), tPos.current)
    LOOK.getPoint(Math.min(t, 1), tLook.current)

    // Release pose: fly to the selected crate and push into the lid gap as r→1
    const target = holdState.releaseTarget
    gap.current.set(
      target.x,
      target.y + 0.55 - r * 0.25,
      target.z + 2.7 - r * 2.5,
    )
    tPos.current.lerp(gap.current, er)
    tLook.current.lerp(target, er)

    // Damp toward target — weight on the facility move, deliberate on the dive
    const lambda = 3.0
    pos.current.x = THREE.MathUtils.damp(pos.current.x, tPos.current.x, lambda, dt)
    pos.current.y = THREE.MathUtils.damp(pos.current.y, tPos.current.y, lambda, dt)
    pos.current.z = THREE.MathUtils.damp(pos.current.z, tPos.current.z, lambda, dt)

    // Breathing + faint gait, suppressed during the crane reveal and the dive
    const calm   = 1 - er
    const driftX = (Math.sin(time * 0.17) * 0.04 + Math.sin(time * 0.10) * 0.02) * calm
    const driftY = (Math.cos(time * 0.13) * 0.022) * calm
    const vel    = Math.abs(holdState.progress - t)
    const gait   = Math.min(vel * 40, 1) * calm
    const bobY   = Math.sin(time * 2.0) * 0.014 * gait

    camera.position.set(
      pos.current.x + driftX,
      pos.current.y + driftY + bobY,
      pos.current.z,
    )

    look.current.x = THREE.MathUtils.damp(look.current.x, tLook.current.x, 2.2, dt)
    look.current.y = THREE.MathUtils.damp(look.current.y, tLook.current.y, 2.2, dt)
    look.current.z = THREE.MathUtils.damp(look.current.z, tLook.current.z, 2.2, dt)
    camera.lookAt(look.current)
  })

  return null
}
