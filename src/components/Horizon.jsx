import { useMemo } from 'react'
import * as THREE from 'three'

// The distant world — three matte-painting layers, kilometres out.
//
// Exponential fog zeroes anything past ~90 units, so true distance is faked
// the way matte painters fake it: each layer is unlit (MeshBasicMaterial,
// fog disabled) with its colour pre-blended toward the sky just above the
// horizon. Farther layer → closer to sky colour → reads as farther through
// more air. Nothing out here competes with the tower; it is background
// texture, the evidence that the world was once much bigger than this walk.

// Layer colours, graded toward the sky's low band (#1d1440-ish on screen)
const FAR_MAT = new THREE.MeshBasicMaterial({ color: '#191442', fog: false })
const MID_MAT = new THREE.MeshBasicMaterial({ color: '#130e35', fog: false })

// Warped box — breaks the machine-perfect silhouette
function WarpedBox({ w, h, d, seed = 1, material, position, rotation }) {
  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(w, h, d, 3, 2, 3)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      pos.setX(i, pos.getX(i) + Math.sin(i * 2.3 + seed) * w * 0.05)
      pos.setY(i, pos.getY(i) + Math.sin(i * 3.1 + seed * 2.0) * h * 0.04)
      pos.setZ(i, pos.getZ(i) + Math.cos(i * 1.7 + seed) * d * 0.07)
    }
    return g
  }, [w, h, d, seed])
  return <mesh geometry={geometry} material={material} position={position} rotation={rotation} />
}

// ─── FAR layer (~z −500) — mesa country at the edge of the world ─────────────
const FAR_MESAS = [
  [-320, -500, 340, 60, 110],
  [ -80, -520, 420, 40, 120],
  [ 200, -490, 300, 72, 110],
  [ 420, -460, 330, 48, 100],
  [-500, -440, 260, 64, 95],
  [ 560, -420, 280, 42, 105],
]

// ─── MID layer (~z −300) — the settlement: towers, a tank, long blocks.
// Big enough to read as buildings, far enough to never resolve. ─────────────
const MID_MESAS = [
  [-340, -310, 170, 34, 75],
  [ 320, -290, 150, 44, 70],
  [ -60, -330, 220, 24, 85],
]

function Settlement() {
  return (
    <group>
      {/* Verticals — chimneys, towers, headframes. Unreadable on purpose. */}
      <WarpedBox material={MID_MAT} w={11} h={52} d={11} seed={3} position={[-190, 26, -295]} />
      <WarpedBox material={MID_MAT} w={9}  h={38} d={9}  seed={4} position={[-162, 19, -308]} />
      <WarpedBox material={MID_MAT} w={14} h={66} d={14} seed={5} position={[-222, 33, -315]} rotation={[0, 0, 0.012]} />
      <WarpedBox material={MID_MAT} w={8}  h={30} d={8}  seed={6} position={[-132, 15, -300]} />

      {/* Tank */}
      <mesh material={MID_MAT} position={[-252, 14, -305]}>
        <cylinderGeometry args={[14, 15, 28, 10]} />
      </mesh>

      {/* Long low blocks — sheds, walls, platforms */}
      <WarpedBox material={MID_MAT} w={88} h={11} d={22} seed={7} position={[-178, 5.5, -290]} rotation={[0, 0.1, 0]} />
      <WarpedBox material={MID_MAT} w={68} h={9}  d={18} seed={8} position={[-246, 4.5, -320]} rotation={[0, -0.08, 0]} />

      {/* Leaning mast — the one shape that suggests it all still meant something */}
      <mesh material={MID_MAT} position={[-116, 24, -298]} rotation={[0.02, 0, 0.1]}>
        <cylinderGeometry args={[1.0, 1.8, 48, 6]} />
      </mesh>
    </group>
  )
}

// ─── NEAR layer (~z −60…−90) — real geometry inside fog range.
// These emerge slowly through the actual fog as the journey advances. ───────
const NEAR_MAT_LIT = new THREE.MeshStandardMaterial({
  color: '#0e0705',
  roughness: 1,
  metalness: 0,
})

const NEAR_ROCKS = [
  [-52,  -64, 13, 7,  14],
  [-95,  -78, 19, 9,  16],
  [ 60,  -88, 17, 8,  15],
]

export function Horizon() {
  return (
    <group>
      {FAR_MESAS.map(([x, z, w, h, d], i) => (
        <WarpedBox key={`f${i}`} material={FAR_MAT} w={w} h={h} d={d} seed={i + 1} position={[x, h / 2, z]} />
      ))}

      {MID_MESAS.map(([x, z, w, h, d], i) => (
        <WarpedBox key={`m${i}`} material={MID_MAT} w={w} h={h} d={d} seed={i + 21} position={[x, h / 2, z]} />
      ))}
      <Settlement />

      {/* Near rocks use lit material + real fog — they dissolve and emerge */}
      {NEAR_ROCKS.map(([x, z, w, h, d], i) => (
        <WarpedBox key={`r${i}`} material={NEAR_MAT_LIT} w={w} h={h} d={d} seed={i + 41} position={[x, h * 0.45, z]} />
      ))}
    </group>
  )
}
