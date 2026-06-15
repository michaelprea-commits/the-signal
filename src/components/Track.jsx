import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../store/scroll'

const HALF_GAUGE    = 0.7175
const TRACK_LENGTH  = 80
const SLEEPER_SPACE = 0.65
const NUM_SLEEPERS  = Math.floor(TRACK_LENGTH / SLEEPER_SPACE)

// ─── Rail segments ───────────────────────────────────────────────────────────
// Rails sit at their final positions from frame zero. All emergence is purely
// opacity — no geometry rising from underground.
//
// The previous approach animated position.y (BURIED_Y → finalY) while
// simultaneously fading opacity. This was silently broken: while the rail was
// below y=0, the ground mesh occluded it via the depth buffer regardless of
// opacity. The pop happened the moment the rail top crossed the surface.
//
// With depthWrite={false} on the rail material and rails at their final
// positions, the opacity fade works correctly against the visible surface.
//
// Two independent scroll phases per segment:
//   mat phase → metallic sheen and emissive hint. No visible geometry.
//   geo phase → cubic opacity ramp (e³). Ghost for the first half, then slow
//               consolidation. At e=0.5 → 12.5% opacity. Full at e=1.
//
// Far segment (near signal) leads. "Yesterday, the tracks were found." (t=0.50)
// lands with far≈10% visible — fragments, not railway. Full recognition
// completes t=0.75–0.87, after the text fades.
const SEGMENTS = [
  { z: -26.65, matStart: 0.10, matSpan: 0.30, geoStart: 0.20, geoSpan: 0.55, finalY: 0.07  },
  { z:   0.0,  matStart: 0.14, matSpan: 0.30, geoStart: 0.26, geoSpan: 0.55, finalY: 0.055 },
  { z:  26.65, matStart: 0.18, matSpan: 0.30, geoStart: 0.32, geoSpan: 0.55, finalY: 0.0   },
]
const SEG_LENGTH = 26.8

const COL_BURIED  = new THREE.Color(0x221408)
const COL_EXPOSED = new THREE.Color(0x3a2218)

// ─── Per-sleeper emergence ───────────────────────────────────────────────────
// Sleepers also sit at final positions with depthWrite={false}. Far sleepers
// (near signal) appear first — cross-shapes before recognition.
const SL_START = 0.30  // z = -TRACK_LENGTH/2 (near signal)
const SL_END   = 0.76  // z = +TRACK_LENGTH/2 (near camera)

// ─── Deterministic per-sleeper geometry ──────────────────────────────────────
function sleeperProfile(i) {
  const ph = i * 0.41 + i * i * 0.003
  const burial = Math.sin(ph) * 0.07 + Math.sin(ph * 2.3) * 0.035 - 0.055
  const tilt   = Math.sin(ph * 1.7) * 0.055
  const skip   = ((i * 37) % 13 === 0)
  return { burial, tilt, skip }
}

export function Track({ position = [0, 0, 0] }) {
  const railRefs    = useRef([])
  const sleeperRefs = useRef([])

  const segE     = useRef([0, 0, 0])
  const segM     = useRef([0, 0, 0])
  const sleeperE = useRef(new Float32Array(NUM_SLEEPERS))

  const sleepers = useMemo(
    () => Array.from({ length: NUM_SLEEPERS }, (_, i) => ({
      z: -TRACK_LENGTH / 2 + i * SLEEPER_SPACE,
      ...sleeperProfile(i),
    })),
    []
  )

  useFrame((_, delta) => {
    const t  = scrollState.smooth
    const dt = Math.min(delta, 0.05)

    // Rails: material blend starts early (hints), geo blend drives opacity
    SEGMENTS.forEach((seg, si) => {
      const matTarget = THREE.MathUtils.clamp((t - seg.matStart) / seg.matSpan, 0, 1)
      const geoTarget = THREE.MathUtils.clamp((t - seg.geoStart) / seg.geoSpan, 0, 1)

      const m = segM.current[si] = THREE.MathUtils.damp(segM.current[si], matTarget, 2.5, dt)
      const e = segE.current[si] = THREE.MathUtils.damp(segE.current[si], geoTarget, 2.5, dt)

      for (let side = 0; side < 2; side++) {
        const mesh = railRefs.current[si * 2 + side]
        if (!mesh) continue

        const mat = mesh.material
        // Cubic opacity: e³ keeps the first half of the fade near-invisible.
        // e=0.5 → 12.5%, e=0.75 → 42%, e=1.0 → 100%.
        // 2% mat hint: a faint metallic shimmer before any shape is legible.
        mat.opacity = 0.02 * m + e * e * e * 0.98

        mat.roughness = THREE.MathUtils.lerp(0.97, 0.42, m)
        mat.metalness = THREE.MathUtils.lerp(0.20, 0.90, m)
        mat.color.lerpColors(COL_BURIED, COL_EXPOSED, m)

        // Warm signal-reflection hint in stage 1 (m growing, e ≈ 0)
        mat.emissive.setHex(0x3a0d04)
        mat.emissiveIntensity = 0.12 * m * (1 - e) + 0.55 * e
      }
    })

    // Per-sleeper: cubic opacity, z-based timing
    const se = sleeperE.current
    for (let i = 0; i < sleepers.length; i++) {
      const mesh = sleeperRefs.current[i]
      if (!mesh) continue
      const zNorm = (sleepers[i].z + TRACK_LENGTH / 2) / TRACK_LENGTH
      const emergeAt = THREE.MathUtils.lerp(SL_START, SL_END, zNorm)
      const target = THREE.MathUtils.clamp((t - emergeAt) / 0.32, 0, 1)
      se[i] = THREE.MathUtils.damp(se[i], target, 2.5, dt)
      const sv = se[i]
      mesh.material.opacity = sv * sv * sv
    }
  })

  return (
    <group position={position}>
      {/* Rails — fixed at final positions, opacity-only emergence */}
      {SEGMENTS.map((seg, si) =>
        [-HALF_GAUGE, HALF_GAUGE].map((x, side) => (
          <mesh
            key={`r${si}-${side}`}
            ref={el => { railRefs.current[si * 2 + side] = el }}
            position={[x, seg.finalY, seg.z]}
            castShadow receiveShadow
          >
            <boxGeometry args={[0.065, 0.09, SEG_LENGTH]} />
            <meshStandardMaterial
              color="#2a1810" roughness={0.97} metalness={0.25}
              transparent opacity={0} depthWrite={false}
            />
          </mesh>
        ))
      )}

      {/* Sleepers — fixed positions, opacity-only emergence */}
      {sleepers.map(({ z, burial, tilt, skip }, i) =>
        skip ? null : (
          <mesh
            key={i}
            ref={el => { sleeperRefs.current[i] = el }}
            position={[0, burial, z]}
            rotation={[tilt, 0, 0]}
            castShadow receiveShadow
          >
            <boxGeometry args={[2.05, 0.11, 0.23]} />
            <meshStandardMaterial
              color="#1a0d05" roughness={1} metalness={0}
              transparent opacity={0} depthWrite={false}
            />
          </mesh>
        )
      )}
    </group>
  )
}
