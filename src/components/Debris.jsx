import * as THREE from 'three'

// Phase 2 evidence — and nothing more. A handful of half-buried shapes
// that could be anything until the rails explain them. The corridor stays
// empty; every object that isn't doing narrative work has been removed.

const woodMat = new THREE.MeshStandardMaterial({ color: '#1a0d05', roughness: 1.0, metalness: 0.0 })
const ironMat = new THREE.MeshStandardMaterial({ color: '#3a2818', roughness: 0.88, metalness: 0.55 })

// Broken sleeper planks — ambiguous timber, close to the buried line
const PLANKS = [
  { pos: [-1.6, -0.05, 47], ry: -0.40, s: [1.3, 0.09, 0.22] },
  { pos: [ 2.6, -0.03, 26], ry:  0.38, s: [1.4, 0.09, 0.22] },
  { pos: [-1.9, -0.04, 14], ry: -1.15, s: [1.2, 0.08, 0.20] },
]

// Rail spikes — just the heads showing
const SPIKES = [
  { pos: [ 1.2, 0.00, 18], ry: 0.30 },
  { pos: [-0.9, 0.00,  8], ry: 1.48 },
]

// A length of detached rail lying at an angle — clearly machined,
// unreadable until you're close. The first "metal shape in the sand".
const STRAY_RAIL = { pos: [2.2, -0.04, 33], ry: 0.28 }

// Rail shards — the railway's first act. Short half-buried stubs of bare
// metal scattered up the early route. The signal's corridor fill picks
// them out as ambiguous red glints long before the rails themselves rise:
// something metallic is down there, shape unknown.
const shardMat = new THREE.MeshStandardMaterial({ color: '#4a3a30', roughness: 0.45, metalness: 0.85 })

// [x, z, ry, length]
const SHARDS = [
  [ 2.3, 64,  0.40, 1.6],
  [-0.8, 57, -1.20, 1.1],
  [ 1.1, 49,  0.90, 2.0],
  [ 3.0, 43, -0.30, 1.3],
  [-1.5, 26,  1.70, 0.9],
  [ 0.4, 21,  2.30, 1.5],
]

export function Debris() {
  return (
    <group>
      {PLANKS.map(({ pos, ry, s }, i) => (
        <mesh key={`pl${i}`} material={woodMat}
          position={pos} rotation={[0, ry, 0]}
          receiveShadow castShadow
        >
          <boxGeometry args={s} />
        </mesh>
      ))}

      {SPIKES.map(({ pos, ry }, i) => (
        <mesh key={`sp${i}`} material={ironMat}
          position={pos} rotation={[0, ry, 0]}
          castShadow
        >
          <boxGeometry args={[0.035, 0.13, 0.035]} />
        </mesh>
      ))}

      <mesh material={ironMat}
        position={STRAY_RAIL.pos} rotation={[0, STRAY_RAIL.ry, 0]}
        castShadow receiveShadow
      >
        <boxGeometry args={[0.065, 0.08, 2.8]} />
      </mesh>

      {SHARDS.map(([x, z, ry, len], i) => (
        <mesh key={`sh${i}`} material={shardMat}
          position={[x, -0.02, z]} rotation={[0.03, ry, 0.04]}
          castShadow receiveShadow
        >
          <boxGeometry args={[0.07, 0.07, len]} />
        </mesh>
      ))}
    </group>
  )
}
