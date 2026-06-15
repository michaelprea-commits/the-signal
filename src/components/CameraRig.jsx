import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../store/scroll'

// ─── Camera Path ─────────────────────────────────────────────────────────────
// A walking line at eye height, slightly right of the buried track (track
// centre x = 0). Lateral drift stays under ~3 m — a person picking their way
// through sand, not a crane move. The line climbs the sand drift at z≈38
// (the occlusion beat: the light vanishes behind it, reappears at the crest),
// settles onto the track axis once the rails are readable, and ends passing
// along the cathedral's face toward the signal.
const PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(1.6, 1.55, 72),
  new THREE.Vector3(2.8, 1.55, 60),
  new THREE.Vector3(1.6, 1.60, 49),
  new THREE.Vector3(1.8, 3.00, 38),   // cresting the low drift
  new THREE.Vector3(0.9, 1.75, 30),
  new THREE.Vector3(0.3, 1.50, 22),
  new THREE.Vector3(0.4, 1.42, 15),   // aligned with the rails — inevitable
  new THREE.Vector3(0.6, 1.40, 9),
  new THREE.Vector3(1.3, 1.38, 3.5),  // alongside the cathedral, before the signal
])

// The gaze settles LEFT of the signal head, not AT it.
// Camera looks toward x=1.0; signal head is at x=2.2 — the 1.2-unit offset
// over 7.5 depth puts the signal at ~64% from the left of the frame,
// creating the "there it is" discovery composition rather than "here it is."
//
// On mobile portrait the horizontal FOV collapses to ~22° (vs desktop ~64°),
// so the same 1.2-unit offset pushes the signal to ~92% from left — nearly
// off-screen. Shift look target right on mobile to put signal at ~63% instead.
const _mobileLook = typeof window !== 'undefined' && window.innerWidth < 768
const SIGNAL_LOOK = new THREE.Vector3(_mobileLook ? 1.8 : 1.0, 3.6, -4)

function smoothstep(a, b, x) {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

export function CameraRig() {
  const { camera } = useThree()

  const currentPos  = useRef(PATH.getPoint(0).clone())
  const currentLook = useRef(PATH.getPoint(0.05).clone())
  const targetPos   = useRef(PATH.getPoint(0).clone())
  const targetLook  = useRef(PATH.getPoint(0.05).clone())
  const aheadVec    = useRef(new THREE.Vector3())

  useEffect(() => {
    // Native scroll listener — works reliably on trackpads, wheels, and touch.
    const onScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      if (maxScroll > 0) {
        scrollState.progress = Math.min(window.scrollY / maxScroll, 1)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll() // read initial state in case page is pre-scrolled

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime
    const dt   = Math.min(delta, 0.05)

    // Frame-rate-independent damping of the raw scroll value. Wheel clicks
    // arrive as steps; the camera should receive a continuous signal.
    scrollState.smooth = THREE.MathUtils.damp(
      scrollState.smooth, scrollState.progress, 2.0, dt,
    )
    const t = scrollState.smooth

    // ── Position ────────────────────────────────────────────────────────────
    PATH.getPoint(Math.min(t, 1), targetPos.current)
    currentPos.current.x = THREE.MathUtils.damp(currentPos.current.x, targetPos.current.x, 3.2, dt)
    currentPos.current.y = THREE.MathUtils.damp(currentPos.current.y, targetPos.current.y, 3.2, dt)
    currentPos.current.z = THREE.MathUtils.damp(currentPos.current.z, targetPos.current.z, 3.2, dt)

    // Breathing drift — always present, very small
    const driftX = Math.sin(time * 0.18) * 0.045 + Math.sin(time * 0.11) * 0.025
    const driftY = Math.cos(time * 0.14) * 0.022 + Math.sin(time * 0.09) * 0.014

    // Step cadence — only while actually moving (scroll velocity gates it)
    const vel  = Math.abs(scrollState.progress - t)
    const gait = Math.min(vel * 45, 1)
    const bobY = Math.sin(time * 2.1) * 0.016 * gait
    const bobX = Math.sin(time * 1.05) * 0.010 * gait

    camera.position.set(
      currentPos.current.x + driftX + bobX,
      currentPos.current.y + driftY + bobY,
      currentPos.current.z,
    )

    // ── Gaze ────────────────────────────────────────────────────────────────
    // Narrative phases:
    //   0–50%   searching  — gaze wanders the horizon, caught by the light
    //   50–75%  discovering — settles ahead along the line of the rails
    //   75–100% following  — locks onto the signal; inevitable
    const searchW = 1 - smoothstep(0.30, 0.52, t)
    const lockW   = smoothstep(0.74, 0.92, t)

    PATH.getPoint(Math.min(t + 0.035, 1), aheadVec.current)
    aheadVec.current.z -= 10  // push the look distance out so wander reads on the horizon
    aheadVec.current.y += 0.9 // chin up — horizon sits in the lower third, sky breathes

    // Slow horizon sweep while searching — capped near ±9° so the gaze
    // stays a person scanning the dark, not a camera operator panning
    aheadVec.current.x += (Math.sin(time * 0.060) * 1.3 + Math.sin(time * 0.037 + 2.1) * 0.8) * searchW
    aheadVec.current.y += Math.sin(time * 0.050 + 0.7) * 0.45 * searchW

    // Involuntary glance — every so often the eye is pulled to the light
    const glance = Math.pow(0.5 + 0.5 * Math.sin(time * 0.09 + 1.4), 12) * searchW

    targetLook.current.lerpVectors(
      aheadVec.current, SIGNAL_LOOK, Math.max(lockW, glance * 0.55),
    )

    currentLook.current.x = THREE.MathUtils.damp(currentLook.current.x, targetLook.current.x, 1.9, dt)
    currentLook.current.y = THREE.MathUtils.damp(currentLook.current.y, targetLook.current.y, 1.9, dt)
    currentLook.current.z = THREE.MathUtils.damp(currentLook.current.z, targetLook.current.z, 1.9, dt)
    camera.lookAt(currentLook.current)
  })

  return null
}
