import * as THREE from 'three'

// The pole line — reduced to the few verticals the frame actually needs.
// Five broken posts marking a route the sand erased. Sparse on purpose:
// the centre of the composition belongs to darkness, atmosphere and the
// light, and every extra silhouette is noise against that.

const POLE_HEIGHT = 5.8
const TRUNK_R = 0.075

// [x, z, leanX_deg, leanZ_deg, height_fraction, has_crossarm]
// All on the LEFT: the centre and right of frame stay empty for the
// light, the emerging rails, and the cathedral's distant mass.
const POLES = [
  [-6.2,  60,  2, -3,    0.88, true],
  [-5.5,  38,  3,  0,    1.00, true],
  [-6.0,  11,  6, -3,    1.00, true],
  [-5.6, -15,  8,  0,    0.78, true],
]

const woodMat = new THREE.MeshStandardMaterial({
  color: '#1e1008',
  roughness: 1.0,
  metalness: 0.0,
})

function Pole({ x, z, leanX, leanZ, heightFrac, hasCrossarm }) {
  const trunkHeight = POLE_HEIGHT * heightFrac

  return (
    // Outer group: world position (base of pole at ground)
    <group position={[x, 0, z]}>
      {/* Inner group: lean rotation pivots around the base */}
      <group rotation={[
        (leanX * Math.PI) / 180,
        0,
        (leanZ * Math.PI) / 180,
      ]}>
        {/* Trunk */}
        <mesh
          material={woodMat}
          position={[0, trunkHeight / 2, 0]}
          castShadow
        >
          <cylinderGeometry args={[TRUNK_R * 0.9, TRUNK_R * 1.15, trunkHeight, 7]} />
        </mesh>

        {/* Crossarm — only on full-height poles */}
        {hasCrossarm && (
          <mesh
            material={woodMat}
            position={[0, trunkHeight * 0.88, 0]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.038, 0.038, 1.3, 6]} />
          </mesh>
        )}
      </group>
    </group>
  )
}

export function TelegraphPoles() {
  return (
    <group>
      {POLES.map(([x, z, lx, lz, hf, ca], i) => (
        <Pole
          key={i}
          x={x} z={z}
          leanX={lx} leanZ={lz}
          heightFrac={hf}
          hasCrossarm={ca}
        />
      ))}
    </group>
  )
}
