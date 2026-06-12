import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../store/scroll'

// The signal. A lower-quadrant semaphore — antique British railway furniture,
// cast iron post, pivoting red arm, lamp spectacle mounted on the post.
// The arm's horizontal rest is DANGER. It drops 45° for CLEAR.
// The cathedral dominates the landscape; this dominates the narrative.

const SIGNAL_POS = [1.6, 0, -4]
const HEAD_Y     = 4.6   // arm pivot height and lamp position
const ARM_LEN    = 1.9   // arm extends this far in −X (toward the track corridor)

const COL_RED   = new THREE.Color('#ff1500')
const COL_GREEN = new THREE.Color('#00ff55')

const postMat          = new THREE.MeshStandardMaterial({ color: '#0e0b09', roughness: 0.88, metalness: 0.52 })
const ironMat          = new THREE.MeshStandardMaterial({ color: '#0b0907', roughness: 0.92, metalness: 0.48 })
const armMat           = new THREE.MeshStandardMaterial({ color: '#921200', roughness: 0.72, metalness: 0.18, emissive: new THREE.Color('#280400'), emissiveIntensity: 0.45 })
const stripeMat        = new THREE.MeshStandardMaterial({ color: '#c8c4bb', roughness: 0.90, metalness: 0.05 })
const spectaclePlateMat= new THREE.MeshStandardMaterial({ color: '#090705', roughness: 0.85, metalness: 0.65 })
const woodMat          = new THREE.MeshStandardMaterial({ color: '#150b06', roughness: 1.0,  metalness: 0.0  })
const plateMat         = new THREE.MeshStandardMaterial({ color: '#070403', roughness: 0.98, metalness: 0.2  })

function makeGlowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0.00, 'rgba(255,255,255,1)')
  g.addColorStop(0.12, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.16)')
  g.addColorStop(0.70, 'rgba(255,255,255,0.035)')
  g.addColorStop(1.00, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

// The signal box — a dead hut on the far side of the line.
function SignalBox() {
  return (
    <group position={[-5.2, 0, -14]} rotation={[0, 0.12, 0]}>
      <mesh material={woodMat} position={[0, 1.15, 0]} castShadow>
        <boxGeometry args={[2.6, 2.3, 3.2]} />
      </mesh>
      <mesh material={plateMat} position={[-0.62, 2.55, 0]} rotation={[0, 0, 0.55]} castShadow>
        <boxGeometry args={[1.6, 0.07, 3.5]} />
      </mesh>
      <mesh material={plateMat} position={[0.62, 2.55, 0]} rotation={[0, 0, -0.55]} castShadow>
        <boxGeometry args={[1.6, 0.07, 3.5]} />
      </mesh>
      <mesh material={plateMat} position={[0.7, 3.0, -0.9]}>
        <boxGeometry args={[0.28, 0.8, 0.28]} />
      </mesh>
    </group>
  )
}

export function Signal() {
  const [isGreen, setIsGreen] = useState(false)
  const finale = useRef(false)

  const glowTex = useMemo(() => makeGlowTexture(), [])

  const armGroupRef  = useRef()  // rotates on state change
  const spectacleRef = useRef()  // coloured glass roundel, moves with arm
  const lampRef      = useRef()  // primary pointLight (fixed on post)
  const fillRef      = useRef()  // fill pointLight (fixed on post)
  const lensRef      = useRef()  // emissive sphere (fixed on post)
  const coreRef      = useRef()  // core glow sprite
  const haloRef      = useRef()  // halo sprite
  const airRef       = useRef()  // air glow sprite

  // Refs so useFrame never reads stale closure values
  const targetGreen = useRef(false)
  const colorBlend  = useRef(0)
  const _col        = useRef(new THREE.Color())  // reused to avoid per-frame alloc

  useEffect(() => {
    const delay = isGreen
      ? finale.current
        ? 16000
        : 1500 + Math.random() * 4000
      : 8000 + Math.random() * 24000
    const id = setTimeout(() => setIsGreen(g => !g), delay)
    return () => clearTimeout(id)
  }, [isGreen])

  useEffect(() => { targetGreen.current = isGreen }, [isGreen])

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime
    const dt   = Math.min(delta, 0.05)

    // Blend toward target aspect — damp transition prevents single-frame
    // HDR spike that would blow Bloom to full white on the toggle
    const blendTarget = targetGreen.current ? 1 : 0
    colorBlend.current = THREE.MathUtils.damp(colorBlend.current, blendTarget, 8, dt)
    const b = colorBlend.current

    // Semaphore arm — lower-quadrant:
    //   b=0 (red/DANGER): arm horizontal (0 rad)
    //   b=1 (green/CLEAR): arm tip drops 45° (PI/4 rad, +Z rotation)
    if (armGroupRef.current) {
      armGroupRef.current.rotation.z = THREE.MathUtils.lerp(0, Math.PI / 4, b)
    }

    _col.current.lerpColors(COL_RED, COL_GREEN, b)
    const baseIntensity = THREE.MathUtils.lerp(30, 20, b)  // red brighter — danger, urgency

    // The lamp breathes — barely. Fast or deep modulation of the scene's
    // dominant light source reads as full-frame flicker (painfully crisp
    // on 120 Hz displays), so scene ILLUMINATION stays near-stable and
    // only the visible glow carries a slow, gentle character.
    const breath = 0.975 + 0.025 * Math.sin(time * 0.6)

    // Glow character: slow wobble + a rare, shallow, smooth gutter
    const gut = THREE.MathUtils.smoothstep(Math.sin(time * 0.41 + 0.5), 0.985, 0.998)
    const glow = (0.94 + 0.06 * Math.sin(time * 0.9 + 1.7)) * (1.0 - 0.15 * gut)

    if (lampRef.current) {
      lampRef.current.intensity = baseIntensity * breath
      lampRef.current.color.copy(_col.current)
    }
    if (fillRef.current) {
      fillRef.current.intensity = baseIntensity * 0.3 * breath
      fillRef.current.color.copy(_col.current)
    }
    if (lensRef.current) {
      lensRef.current.material.emissiveIntensity = 14 * glow
      lensRef.current.material.color.copy(_col.current)
      lensRef.current.material.emissive.copy(_col.current)
    }
    if (spectacleRef.current) {
      spectacleRef.current.material.emissiveIntensity = 5 * glow
      spectacleRef.current.material.color.copy(_col.current)
      spectacleRef.current.material.emissive.copy(_col.current)
    }
    if (coreRef.current) {
      coreRef.current.material.opacity = 0.85 * glow
      coreRef.current.material.color.copy(_col.current)
    }
    if (haloRef.current) {
      haloRef.current.material.opacity = 0.2 * (0.7 + 0.3 * glow)
      haloRef.current.material.color.copy(_col.current)
    }
    if (airRef.current) {
      airRef.current.material.color.copy(_col.current)
    }

    if (!finale.current && scrollState.smooth > 0.965) {
      finale.current = true
      setTimeout(() => setIsGreen(true), 2600)
    }
  })

  return (
    <group>
      <group position={SIGNAL_POS}>

        {/* ── Concrete footing ───────────────────────────────────────────── */}
        <mesh material={plateMat} position={[0, 0.18, 0]} receiveShadow>
          <boxGeometry args={[0.52, 0.36, 0.52]} />
        </mesh>

        {/* ── Post — tapered cast-iron tube ──────────────────────────────── */}
        <mesh material={postMat} position={[0, 2.9, 0]} castShadow>
          <cylinderGeometry args={[0.060, 0.090, 5.8, 10]} />
        </mesh>

        {/* Finial cap */}
        <mesh material={ironMat} position={[0, 5.86, 0]}>
          <sphereGeometry args={[0.10, 8, 6]} />
        </mesh>

        {/* ── Pivot bracket — fixed ironwork at arm height ───────────────── */}
        <mesh material={ironMat} position={[0, HEAD_Y, 0]} castShadow>
          <boxGeometry args={[0.30, 0.36, 0.30]} />
        </mesh>

        {/* ── Semaphore arm (rotates) ────────────────────────────────────── */}
        {/* Pivot at [0, HEAD_Y, 0]. Arm extends −X toward the track corridor.
            At x=1.6 signal, arm tip reaches x≈−0.3 — hangs over the near rail,
            governing the line it has not stopped for centuries. */}
        <group ref={armGroupRef} position={[0, HEAD_Y, 0]}>

          {/* Arm blade */}
          <mesh material={armMat} position={[-ARM_LEN / 2, 0, 0]} castShadow>
            <boxGeometry args={[ARM_LEN, 0.27, 0.058]} />
          </mesh>

          {/* White identification stripe near pivot end */}
          <mesh material={stripeMat} position={[-0.30, 0, 0.033]}>
            <boxGeometry args={[0.27, 0.29, 0.014]} />
          </mesh>

          {/* Spectacle plate — circular disc, faces +Z approach direction */}
          <mesh material={spectaclePlateMat} position={[0, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.052, 16]} />
          </mesh>

          {/* Spectacle roundel — emissiveIntensity={0} for same reason as lens */}
          <mesh ref={spectacleRef} position={[0, 0, 0.16]}>
            <circleGeometry args={[0.135, 12]} />
            <meshStandardMaterial
              color={COL_RED}
              emissive={COL_RED}
              emissiveIntensity={0}
              toneMapped={false}
            />
          </mesh>

          {/* Counterweight — short block below and opposite the arm */}
          <mesh material={ironMat} position={[0.37, -0.21, 0]} castShadow>
            <boxGeometry args={[0.32, 0.18, 0.12]} />
          </mesh>

        </group>

        {/* ── Lamp housing (fixed on post, faces approach direction) ─────── */}
        {/* The lamp does not move — the spectacle rotates in front of it */}
        <mesh material={ironMat} position={[0, HEAD_Y - 0.05, 0.22]} castShadow>
          <boxGeometry args={[0.24, 0.34, 0.30]} />
        </mesh>

        {/* Hood above lamp housing */}
        <mesh material={ironMat} position={[0, HEAD_Y + 0.22, 0.26]}>
          <boxGeometry args={[0.28, 0.065, 0.40]} />
        </mesh>

        {/* ── Lamp assembly (all fixed — glow, sprites, lights) ─────────── */}
        <group position={[0, HEAD_Y, 0.26]}>

          {/* Lens sphere — drives Bloom.
              emissiveIntensity={0} at JSX-init so R3F reconciliation resets
              are dark (imperceptible) not bright. useFrame owns the value
              every frame; it was the JSX-declared 14 that caused the flash. */}
          <mesh ref={lensRef}>
            <sphereGeometry args={[0.10, 10, 10]} />
            <meshStandardMaterial
              color={COL_RED}
              emissive={COL_RED}
              emissiveIntensity={0}
              toneMapped={false}
            />
          </mesh>

          {/* Primary lamp — intensity={0} at init; useFrame owns it every frame */}
          <pointLight ref={lampRef} color={COL_RED} intensity={0} distance={30} decay={2} />

          {/* Atmospheric fill — same: intensity={0} at init */}
          <pointLight ref={fillRef} color={COL_RED} intensity={0} distance={80} decay={1.4} />

          {/* Core glare */}
          <sprite ref={coreRef} scale={[0.9, 0.9, 1]}>
            <spriteMaterial
              map={glowTex} color={COL_RED}
              transparent opacity={0.85}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              fog={false} toneMapped={false}
            />
          </sprite>

          {/* Outer halo — the light you see before you know what it is */}
          <sprite ref={haloRef} scale={[5.5, 5.5, 1]}>
            <spriteMaterial
              map={glowTex} color={COL_RED}
              transparent opacity={0.2}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              fog={false} toneMapped={false}
            />
          </sprite>

          {/* Air glow — very wide, very faint: the light smeared into the atmosphere */}
          <sprite ref={airRef} scale={[12, 12, 1]}>
            <spriteMaterial
              map={glowTex} color={COL_RED}
              transparent opacity={0.06}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              fog={false} toneMapped={false}
            />
          </sprite>

        </group>
      </group>

      <SignalBox />
    </group>
  )
}
