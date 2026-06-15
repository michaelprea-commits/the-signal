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

// Layer colours: each step closer to the sky tone (aerial perspective).
// FAR must be noticeably lighter than MID — the differential is what
// creates visible depth bands rather than a single dark mass.
const FAR_MAT = new THREE.MeshBasicMaterial({ color: '#2e2668', fog: false })
const MID_MAT = new THREE.MeshBasicMaterial({ color: '#1e1550', fog: false })

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

// No city here. No towers.
// Geology, or the scale at which industry becomes geology.
// Each shape must leave room for a different reading: mesa / ruin / machine.
function Settlement() {
  return (
    <group>
      {/* Vast eroded massif — the spine of something enormous. Geology? Infrastructure? */}
      <WarpedBox material={MID_MAT} w={340} h={20} d={95} seed={11} position={[-140, 10, -312]} />

      {/* Scarped cliff face — where the massif has broken away at an angle */}
      <WarpedBox material={MID_MAT} w={58} h={36} d={52} seed={12} position={[-295, 18, -290]} rotation={[0, -0.04, 0.014]} />

      {/* Long collapsed embankment — aqueduct, berm, or buried wall. Barely legible. */}
      <WarpedBox material={MID_MAT} w={200} h={7} d={24} seed={13} position={[-430, 3.5, -308]} rotation={[0, 0.14, 0.028]} />

      {/* Right plateau — sedimentary strata in cross-section, or a sheared platform */}
      <WarpedBox material={MID_MAT} w={95} h={28} d={62} seed={14} position={[335, 14, -296]} rotation={[0, -0.06, 0]} />

      {/* A remnant whose purpose is unreadable — structural mass, not a tower */}
      <WarpedBox material={MID_MAT} w={48} h={44} d={44} seed={15} position={[490, 22, -280]} rotation={[0, 0.08, 0.016]} />
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
