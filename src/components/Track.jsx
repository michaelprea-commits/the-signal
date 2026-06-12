import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../store/scroll'

const HALF_GAUGE    = 0.7175
const TRACK_LENGTH  = 80
const SLEEPER_SPACE = 0.65
const NUM_SLEEPERS  = Math.floor(TRACK_LENGTH / SLEEPER_SPACE)

// ─── Rail segments ───────────────────────────────────────────────────────────
// The rails surface in three staggered stretches, starting at the SIGNAL
// end and assembling toward the camera — the line is discovered pointing
// at the light, not switched on. The near stretch (the beginning of the
// walk) never fully surfaces: sand still owns it, rail heads just breaking
// the crust.   [local z centre, emerge start, emerge span, final rail y]
// Long, overlapping windows and a short lift: the rails don't pop out of
// the sand, the sand slowly stops covering them. Most of the reveal is
// the material turning from caked grit to glinting iron.
const SEGMENTS = [
  { z: -26.65, start: 0.45, span: 0.22, finalY: 0.07  },  // at the signal — first
  { z:   0.0,  start: 0.52, span: 0.22, finalY: 0.055 },
  { z:  26.65, start: 0.60, span: 0.22, finalY: 0.0   },  // underfoot — partial, sand-covered
]
const SEG_LENGTH = 26.8
const BURIED_Y   = -0.07

const COL_BURIED  = new THREE.Color(0x221408)
const COL_EXPOSED = new THREE.Color(0x3a2218)

// ─── Deterministic per-sleeper geometry ──────────────────────────────────────
function sleeperProfile(i) {
  const ph = i * 0.41 + i * i * 0.003
  // Baseline burial: most sleepers are partially buried throughout
  const burial = Math.sin(ph) * 0.07 + Math.sin(ph * 2.3) * 0.035 - 0.055
  const tilt   = Math.sin(ph * 1.7) * 0.055
  const skip   = ((i * 37) % 13 === 0)   // ~1 in 13 sleepers completely missing
  return { burial, tilt, skip }
}

export function Track({ position = [0, 0, 0] }) {
  const groupRef  = useRef()
  const railRefs  = useRef([])   // SEGMENTS.length * 2 meshes
  const segE      = useRef([0, 0, 0]) // displayed emergence, time-damped

  const sleepers = useMemo(
    () => Array.from({ length: NUM_SLEEPERS }, (_, i) => ({
      z: -TRACK_LENGTH / 2 + i * SLEEPER_SPACE,
      ...sleeperProfile(i),
    })),
    []
  )

  // ── Scroll-driven emergence, time-damped ───────────────────────────────────
  // Scroll sets each segment's TARGET; the displayed value chases it with
  // a ~2 s time constant, so the reveal can never be sudden no matter how
  // hard the wheel is flicked. Rails also FADE up (opacity) while their
  // material turns from caked grit to glinting iron.
  useFrame((_, delta) => {
    const t  = scrollState.smooth
    const dt = Math.min(delta, 0.05)

    const emerge = THREE.MathUtils.clamp((t - 0.45) / 0.27, 0, 1)
    if (groupRef.current) {
      groupRef.current.position.y = THREE.MathUtils.lerp(-0.32, -0.03, emerge)
    }

    SEGMENTS.forEach((seg, si) => {
      const target = THREE.MathUtils.clamp((t - seg.start) / seg.span, 0, 1)
      const e = segE.current[si] = THREE.MathUtils.damp(segE.current[si], target, 1.1, dt)
      for (let side = 0; side < 2; side++) {
        const mesh = railRefs.current[si * 2 + side]
        if (!mesh) continue
        mesh.position.y = THREE.MathUtils.lerp(BURIED_Y, seg.finalY, e)
        const mat = mesh.material
        mat.opacity   = THREE.MathUtils.smoothstep(e, 0, 0.7)
        mat.roughness = THREE.MathUtils.lerp(0.97, 0.42, e)
        mat.metalness = THREE.MathUtils.lerp(0.20, 0.90, e)
        mat.color.lerpColors(COL_BURIED, COL_EXPOSED, e)
        mat.emissive.setHex(0x3a0d04)
        mat.emissiveIntensity = 0.55 * e
      }
    })
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Rails — three staggered segments per side */}
      {SEGMENTS.map((seg, si) =>
        [-HALF_GAUGE, HALF_GAUGE].map((x, side) => (
          <mesh
            key={`r${si}-${side}`}
            ref={el => { railRefs.current[si * 2 + side] = el }}
            position={[x, BURIED_Y, seg.z]}
            castShadow receiveShadow
          >
            <boxGeometry args={[0.065, 0.09, SEG_LENGTH]} />
            <meshStandardMaterial
              color="#2a1810" roughness={0.97} metalness={0.25}
              transparent opacity={0}
            />
          </mesh>
        ))
      )}

      {/* Sleepers */}
      {sleepers.map(({ z, burial, tilt, skip }, i) =>
        skip ? null : (
          <mesh
            key={i}
            position={[0, burial, z]}
            rotation={[tilt, 0, 0]}
            castShadow receiveShadow
          >
            <boxGeometry args={[2.05, 0.11, 0.23]} />
            <meshStandardMaterial color="#1a0d05" roughness={1} metalness={0} />
          </mesh>
        )
      )}
    </group>
  )
}
