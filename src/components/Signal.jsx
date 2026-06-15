import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../store/scroll'

// British upper-quadrant semaphore signal.
// Arm horizontal = DANGER (red, default). Arm raised 45° = CLEAR (green).
// Signal stays red until the user reaches the final text card, then goes
// green permanently — one transition, no oscillation.
//
// The spectacle plate (lenses) is FIXED on the post. Only the arm blade
// rotates. The lamp housing sits behind the plate at Z=0.15; the plate
// is in front at Z=0.32.

const SIGNAL_POS = [2.2, 0, -4]
const HEAD_Y     = 4.6
const ARM_LEN    = 1.9

const COL_RED   = new THREE.Color('#ff1500')
const COL_GREEN = new THREE.Color('#00ff55')

const LENS_SEP = 0.370
const LENS_R   = 0.148

// ── Materials ─────────────────────────────────────────────────────────────────
const postMat = new THREE.MeshStandardMaterial({
  color: '#0d0b09', roughness: 0.90, metalness: 0.56,
})
const ironMat = new THREE.MeshStandardMaterial({
  color: '#0b0907', roughness: 0.93, metalness: 0.50,
})
const ironLightMat = new THREE.MeshStandardMaterial({
  color: '#181310', roughness: 0.86, metalness: 0.54,
})
const armMat = new THREE.MeshStandardMaterial({
  color: '#8a1100', roughness: 0.76, metalness: 0.14,
  emissive: new THREE.Color('#1e0400'), emissiveIntensity: 0.35,
})
const stripeMat = new THREE.MeshStandardMaterial({
  color: '#aeaaa0', roughness: 0.92, metalness: 0.05,
})
const specPlateMat = new THREE.MeshStandardMaterial({
  color: '#080604', roughness: 0.88, metalness: 0.64,
})
const lampBodyMat = new THREE.MeshStandardMaterial({
  color: '#0c0a08', roughness: 0.80, metalness: 0.62,
})
const brassMat = new THREE.MeshStandardMaterial({
  color: '#28200e', roughness: 0.66, metalness: 0.78,
})
const concreteMat = new THREE.MeshStandardMaterial({
  color: '#100e0c', roughness: 0.98, metalness: 0.04,
})
const woodMat  = new THREE.MeshStandardMaterial({ color: '#150b06', roughness: 1.0,  metalness: 0.0 })
const plateMat = new THREE.MeshStandardMaterial({ color: '#070403', roughness: 0.98, metalness: 0.2 })

function makeGlowTexture() {
  const size   = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx    = canvas.getContext('2d')
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

function SignalBox() {
  // Evidence of former habitation. Not a landmark.
  // Smaller and further left so the eye passes through it to the signal.
  // Base sunk 0.8 units — partial burial suggests decades of neglect.
  return (
    <group position={[-7.0, -0.8, -16]} rotation={[0, 0.12, 0.026]} scale={0.72}>

      {/* ── Ground floor ─────────────────────────────────────────────────── */}
      <mesh material={woodMat} position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[3.4, 2.0, 5.5]} />
      </mesh>

      {/* ── Operating floor — bay projection, slightly wider and offset ─── */}
      <mesh material={woodMat} position={[0.08, 3.05, 0]} castShadow>
        <boxGeometry args={[3.7, 2.1, 5.7]} />
      </mesh>

      {/* ── Roof ─────────────────────────────────────────────────────────── */}
      {/* Left pitch — 37°, steeper, intact */}
      <mesh material={plateMat} position={[-0.83, 4.86, 0.1]} rotation={[0, 0, 0.64]}>
        <boxGeometry args={[2.55, 0.09, 5.8]} />
      </mesh>
      {/* Right pitch — 23°, shallower, stops short at rear */}
      <mesh material={plateMat} position={[0.89, 4.52, -0.4]} rotation={[0, 0, -0.41]}>
        <boxGeometry args={[2.1, 0.09, 4.2]} />
      </mesh>
      {/* Ridge board — off-centre, warped */}
      <mesh material={plateMat} position={[0.06, 5.28, 0.05]} rotation={[0.015, 0, 0.018]}>
        <boxGeometry args={[0.16, 0.70, 5.8]} />
      </mesh>
      {/* Front gable */}
      <mesh material={plateMat} position={[0.04, 4.74, -2.9]}>
        <boxGeometry args={[3.6, 2.5, 0.11]} />
      </mesh>
      {/* Rear gable */}
      <mesh material={plateMat} position={[0.0, 4.74, 2.9]}>
        <boxGeometry args={[3.6, 2.5, 0.11]} />
      </mesh>

      {/* ── Chimney ──────────────────────────────────────────────────────── */}
      <mesh material={ironMat} position={[0.6, 5.85, 0.4]} rotation={[0.02, 0, 0.14]} castShadow>
        <boxGeometry args={[0.48, 1.7, 0.48]} />
      </mesh>
      <mesh material={ironMat} position={[0.48, 6.76, 0.46]} rotation={[0.12, 0.06, 0.21]}>
        <boxGeometry args={[0.30, 0.15, 0.22]} />
      </mesh>

      {/* ── Detached cladding board ──────────────────────────────────────── */}
      <mesh material={woodMat} position={[1.88, 3.55, 1.0]} rotation={[0.05, 0, 0.16]}>
        <boxGeometry args={[0.12, 0.88, 0.65]} />
      </mesh>

    </group>
  )
}

// ── Spectacle plate (FIXED — not a child of armGroupRef) ─────────────────────
// Rectangular iron casting at Z=0.32, in front of lamp housing (Z=0.15 ±0.09).
// Red lens left, green lens right. Sprites co-located with each lens.
function SpectaclePlate({ redLensRef, greenLensRef, redCoreRef, greenCoreRef, glowTex }) {
  return (
    <group position={[0, 0, 0.32]}>

      {/* Main casting */}
      <mesh material={specPlateMat} castShadow>
        <boxGeometry args={[0.86, 0.40, 0.050]} />
      </mesh>

      {/* Bezel rings */}
      {[-LENS_SEP / 2, LENS_SEP / 2].map((x, i) => (
        <mesh key={i} material={ironMat} position={[x, 0, 0.030]}>
          <cylinderGeometry args={[LENS_R + 0.026, LENS_R + 0.026, 0.026, 20, 1, true]} />
        </mesh>
      ))}

      {/* Red lens (left) */}
      <mesh ref={redLensRef} position={[-LENS_SEP / 2, 0, 0.046]}>
        <circleGeometry args={[LENS_R, 20]} />
        <meshStandardMaterial
          color={COL_RED} emissive={COL_RED} emissiveIntensity={0}
          toneMapped={false} roughness={0.08}
        />
      </mesh>

      {/* Green lens (right) */}
      <mesh ref={greenLensRef} position={[LENS_SEP / 2, 0, 0.046]}>
        <circleGeometry args={[LENS_R, 20]} />
        <meshStandardMaterial
          color={COL_GREEN} emissive={COL_GREEN} emissiveIntensity={0}
          toneMapped={false} roughness={0.08}
        />
      </mesh>

      {/* Centre rib */}
      <mesh material={specPlateMat} position={[0, 0, 0.030]}>
        <boxGeometry args={[0.036, 0.38, 0.036]} />
      </mesh>

      {/* Corner bolt heads */}
      {[[-0.37, 0.16], [0.37, 0.16], [-0.37, -0.16], [0.37, -0.16]].map(([x, y], i) => (
        <mesh key={i} material={brassMat} position={[x, y, 0.034]}>
          <cylinderGeometry args={[0.021, 0.021, 0.016, 6]} />
        </mesh>
      ))}

      {/* Core glow at red lens */}
      <sprite ref={redCoreRef} position={[-LENS_SEP / 2, 0, 0.10]} scale={[0.7, 0.7, 1]}>
        <spriteMaterial
          map={glowTex} color={COL_RED}
          transparent opacity={0}
          depthWrite={false} blending={THREE.AdditiveBlending}
          fog={false} toneMapped={false}
        />
      </sprite>

      {/* Core glow at green lens */}
      <sprite ref={greenCoreRef} position={[LENS_SEP / 2, 0, 0.10]} scale={[0.7, 0.7, 1]}>
        <spriteMaterial
          map={glowTex} color={COL_GREEN}
          transparent opacity={0}
          depthWrite={false} blending={THREE.AdditiveBlending}
          fog={false} toneMapped={false}
        />
      </sprite>

    </group>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export function Signal() {
  const glowTex = useMemo(() => makeGlowTexture(), [])

  // Only the arm rotates
  const armGroupRef  = useRef()

  // Spectacle plate refs (fixed)
  const redLensRef   = useRef()
  const greenLensRef = useRef()
  const redCoreRef   = useRef()
  const greenCoreRef = useRef()

  // Lamp refs (fixed)
  const lampRef  = useRef()
  const fillRef  = useRef()
  const haloRef  = useRef()
  const airRef   = useRef()

  const targetGreen  = useRef(false)
  const colorBlend   = useRef(0)
  const _col         = useRef(new THREE.Color())

  // Finale: green triggers once past threshold, reverses when scrolled back.
  // Timer fires after 2600ms dramatic pause; cleared immediately on reversal.
  const greenArmed = useRef(false)
  const timerRef   = useRef(null)

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime
    const dt   = Math.min(delta, 0.05)

    const blendTarget = targetGreen.current ? 1 : 0
    colorBlend.current = THREE.MathUtils.damp(colorBlend.current, blendTarget, 8, dt)
    const b = colorBlend.current

    // Upper-quadrant: arm horizontal = DANGER (b=0), raised 45° = CLEAR (b=1)
    if (armGroupRef.current) {
      armGroupRef.current.rotation.z = THREE.MathUtils.lerp(0, -Math.PI / 4, b)
    }

    _col.current.lerpColors(COL_RED, COL_GREEN, b)
    const baseIntensity = THREE.MathUtils.lerp(30, 20, b)
    const breath = 0.975 + 0.025 * Math.sin(time * 0.6)
    const gut    = THREE.MathUtils.smoothstep(Math.sin(time * 0.41 + 0.5), 0.985, 0.998)
    const glow   = (0.94 + 0.06 * Math.sin(time * 0.9 + 1.7)) * (1.0 - 0.15 * gut)

    // Occlude scene lights while the signal is behind the sand ridge (z≈38).
    // Without this, point lights bleed through the terrain to the camera side.
    // Sprites are naturally occluded by depth testing; only lights need fading.
    // Fade out: t=0.17→0.22 (lamp disappears behind ridge)
    // Fade in:  t=0.35→0.40 (camera crests, lamp reappears)
    const st      = scrollState.smooth
    const intoRidge  = THREE.MathUtils.smoothstep(0.17, 0.22, st)
    const outOfRidge = THREE.MathUtils.smoothstep(0.35, 0.40, st)
    const lightMult  = 1 - intoRidge * (1 - outOfRidge)

    if (lampRef.current) {
      lampRef.current.intensity = baseIntensity * breath * lightMult
      lampRef.current.color.copy(_col.current)
    }
    if (fillRef.current) {
      fillRef.current.intensity = baseIntensity * 0.3 * breath * lightMult
      fillRef.current.color.copy(_col.current)
    }

    // Lenses cross-fade
    if (redLensRef.current)   redLensRef.current.material.emissiveIntensity   = (1 - b) * 4 * glow
    if (greenLensRef.current) greenLensRef.current.material.emissiveIntensity = b * 4 * glow

    // Core sprites cross-fade
    if (redCoreRef.current)   redCoreRef.current.material.opacity   = (1 - b) * 0.90 * glow
    if (greenCoreRef.current) greenCoreRef.current.material.opacity = b * 0.90 * glow

    if (haloRef.current) {
      haloRef.current.material.opacity = 0.18 * (0.7 + 0.3 * glow)
      haloRef.current.material.color.copy(_col.current)
    }
    if (airRef.current) {
      airRef.current.material.color.copy(_col.current)
    }

    // Finale: bidirectional — green when past threshold, red when reversed.
    const pastThreshold = scrollState.smooth > 0.965
    if (pastThreshold && !greenArmed.current) {
      greenArmed.current = true
      timerRef.current = setTimeout(() => { targetGreen.current = true }, 2600)
    } else if (!pastThreshold && greenArmed.current) {
      greenArmed.current = false
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
      targetGreen.current = false
    }
  })

  return (
    <group>
      <group position={SIGNAL_POS}>

        {/* ── Concrete footing ─────────────────────────────────────────────── */}
        <mesh material={concreteMat} position={[0, 0.20, 0]} receiveShadow>
          <boxGeometry args={[0.58, 0.40, 0.58]} />
        </mesh>

        {/* ── Post ─────────────────────────────────────────────────────────── */}
        <mesh material={postMat} position={[0, 2.9, 0]} castShadow>
          <cylinderGeometry args={[0.062, 0.096, 5.8, 12]} />
        </mesh>

        {/* Finial cap */}
        <mesh material={ironMat} position={[0, 5.86, 0]}>
          <sphereGeometry args={[0.10, 8, 6]} />
        </mesh>

        {/* Step irons */}
        {[1.20, 1.80].map((y, i) => (
          <mesh key={i} material={ironMat} position={[0.14, y, 0]}>
            <boxGeometry args={[0.20, 0.024, 0.065]} />
          </mesh>
        ))}

        {/* ── Pivot collar ─────────────────────────────────────────────────── */}
        <mesh material={ironLightMat} position={[0, HEAD_Y, 0]} castShadow>
          <cylinderGeometry args={[0.118, 0.118, 0.30, 16]} />
        </mesh>
        {[-0.162, 0.162].map((dy, i) => (
          <mesh key={i} material={ironMat} position={[0, HEAD_Y + dy, 0]}>
            <cylinderGeometry args={[0.134, 0.134, 0.022, 16]} />
          </mesh>
        ))}
        <mesh material={brassMat} position={[0, HEAD_Y, 0.126]}>
          <cylinderGeometry args={[0.028, 0.028, 0.020, 6]} />
        </mesh>

        {/* ── Lamp housing (FIXED) ─────────────────────────────────────────── */}
        {/* Center Z=0.15, depth 0.18 → front face Z=0.24                      */}
        {/* Spectacle plate is at Z=0.32 — clearly in front                     */}
        <group position={[0, HEAD_Y, 0.15]}>

          <mesh material={lampBodyMat} castShadow>
            <boxGeometry args={[0.60, 0.36, 0.18]} />
          </mesh>

          {/* Rain hood */}
          <mesh material={ironMat} position={[0, 0.21, 0.06]}>
            <boxGeometry args={[0.66, 0.050, 0.32]} />
          </mesh>

          {/* Side louvers */}
          {[-0.32, 0.32].map((x, i) => (
            <group key={i} position={[x, 0, 0]}>
              {[-0.08, 0, 0.08].map((dy, j) => (
                <mesh key={j} material={ironMat} position={[0, dy, 0]} rotation={[0, 0, 0.28]}>
                  <boxGeometry args={[0.016, 0.078, 0.12]} />
                </mesh>
              ))}
            </group>
          ))}

          {/* Rear mounting plate */}
          <mesh material={ironMat} position={[0, 0, -0.10]}>
            <boxGeometry args={[0.66, 0.42, 0.022]} />
          </mesh>

          {/* Bracket ears */}
          {[-0.24, 0.24].map((x, i) => (
            <mesh key={i} material={brassMat} position={[x, 0, -0.12]}>
              <cylinderGeometry args={[0.020, 0.020, 0.048, 8]} rotation={[Math.PI / 2, 0, 0]} />
            </mesh>
          ))}

          {/* Scene lights */}
          <pointLight ref={lampRef} color={COL_RED} intensity={0} distance={30} decay={2} />
          <pointLight ref={fillRef} color={COL_RED} intensity={0} distance={80} decay={1.4} />

          {/* Wide halo + air-glow */}
          <sprite ref={haloRef} scale={[5.5, 5.5, 1]}>
            <spriteMaterial
              map={glowTex} color={COL_RED}
              transparent opacity={0.18}
              depthWrite={false} blending={THREE.AdditiveBlending}
              fog={false} toneMapped={false}
            />
          </sprite>

          <sprite ref={airRef} scale={[12, 12, 1]}>
            <spriteMaterial
              map={glowTex} color={COL_RED}
              transparent opacity={0.06}
              depthWrite={false} blending={THREE.AdditiveBlending}
              fog={false} toneMapped={false}
            />
          </sprite>

        </group>

        {/* ── Spectacle plate (FIXED — does not rotate) ────────────────────── */}
        <group position={[0, HEAD_Y, 0]}>
          <SpectaclePlate
            redLensRef={redLensRef}
            greenLensRef={greenLensRef}
            redCoreRef={redCoreRef}
            greenCoreRef={greenCoreRef}
            glowTex={glowTex}
          />
        </group>

        {/* ── Rotating arm (ONLY the blade + stripes + counterweight) ──────── */}
        <group ref={armGroupRef} position={[0, HEAD_Y, 0]}>

          {/* Arm blade — red oxide, extends −X */}
          <mesh material={armMat} position={[-ARM_LEN / 2, 0, 0]} castShadow>
            <boxGeometry args={[ARM_LEN, 0.26, 0.058]} />
          </mesh>

          {/* Fishplate at pivot root */}
          <mesh material={ironMat} position={[-0.10, 0, 0]}>
            <boxGeometry args={[0.24, 0.30, 0.068]} />
          </mesh>

          {/* Primary white stripe */}
          <mesh material={stripeMat} position={[-0.30, 0, 0.036]}>
            <boxGeometry args={[0.26, 0.27, 0.016]} />
          </mesh>

          {/* Second narrow stripe (GWR double-band) */}
          <mesh material={stripeMat} position={[-ARM_LEN * 0.60, 0, 0.034]}>
            <boxGeometry args={[0.09, 0.27, 0.012]} />
          </mesh>

          {/* Counterweight below pivot */}
          <mesh material={ironMat} position={[0.35, -0.21, 0]} castShadow>
            <boxGeometry args={[0.30, 0.18, 0.14]} />
          </mesh>
          <mesh material={ironMat} position={[0.16, -0.10, 0]}>
            <boxGeometry args={[0.058, 0.20, 0.040]} />
          </mesh>

        </group>

      </group>

      <SignalBox />
    </group>
  )
}
