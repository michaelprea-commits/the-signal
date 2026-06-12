import * as THREE from 'three'

// Sparse scrub, kept well clear of the corridor — the centre of the frame
// belongs to the light, the buried track, and the air. Nothing else.
// Each clump is a pair of crossed planes (billboard technique).
const CLUMPS = [
  { pos: [-16, 0, 42],  s: 0.8 },
  { pos: [ 18, 0, 28],  s: 0.7 },
  { pos: [-19, 0, -9],  s: 1.1 },
  { pos: [-14, 0, 12],  s: 0.7 },
]

// Dried desert scrub colour — sun-bleached, centuries dead
const MAT_PROPS = {
  color: '#7a6040',
  roughness: 1,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.88,
}

function Clump({ pos, s }) {
  return (
    <group position={pos} scale={s}>
      {/* Two planes at 90° = convincing low-poly shrub from any angle */}
      <mesh rotation={[0, 0, 0]}>
        <planeGeometry args={[0.7, 0.45]} />
        <meshStandardMaterial {...MAT_PROPS} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.7, 0.45]} />
        <meshStandardMaterial {...MAT_PROPS} />
      </mesh>
    </group>
  )
}

export function Vegetation() {
  return (
    <group>
      {CLUMPS.map((c, i) => <Clump key={i} {...c} />)}
    </group>
  )
}
