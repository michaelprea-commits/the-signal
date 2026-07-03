import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HoldCameraRig } from './HoldCameraRig'
import { Crates } from './Crates'
import { PostFX } from '../components/PostFX'

// Lighting follows The Signal's philosophy: near-black, almost no ambient,
// one meaningful source. Here the meaningful light is the crate glow (in
// Crates.jsx); this is just the cold work-light from above-left and the
// faintest hemisphere wash so the floor and silhouettes aren't pure void.
function Lighting() {
  return (
    <>
      <hemisphereLight skyColor="#0b1a1e" groundColor="#020303" intensity={0.35} />
      <ambientLight color="#061212" intensity={0.12} />
      {/* the hanging work-light, upper-left (where the keeper stands under it) */}
      <spotLight position={[-1.8, 9.5, 3.6]} angle={0.55} penumbra={0.9}
        intensity={60} distance={28} decay={2} color="#a9c0cc" />
    </>
  )
}

// The keeper — clearly a placeholder for the billboarded silhouette / GLB.
// A dark figure under the work-light, rod raised toward the crate, a spark
// that crackles. Sound and the recoiling tentacle come later.
function Keeper() {
  const spark = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // the spark is a glow element, so it's allowed fast character (a crackle)
    const f = 0.5 + 0.5 * Math.sin(t * 41) * Math.sin(t * 13.3)
    if (spark.current) spark.current.intensity = 1.4 + f * 2.6
  })
  return (
    <group position={[-1.5, 0, 2.75]}>
      <mesh position={[0, 0.82, 0]}>
        <capsuleGeometry args={[0.22, 0.92, 4, 8]} />
        <meshStandardMaterial color="#040506" roughness={1} />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.19, 16, 16]} />
        <meshStandardMaterial color="#040506" roughness={1} />
      </mesh>
      {/* arm raised toward the crate */}
      <mesh position={[0.42, 1.26, -0.05]} rotation={[0, 0, -0.7]}>
        <boxGeometry args={[0.66, 0.11, 0.11]} />
        <meshStandardMaterial color="#040506" roughness={1} />
      </mesh>
      {/* the spark — the only near-white in the frame */}
      <mesh position={[0.78, 1.5, -0.05]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="#eaf8ff" fog={false} />
      </mesh>
      <pointLight ref={spark} position={[0.78, 1.5, -0.05]} color="#cfe6ff" intensity={2.5} distance={4.5} decay={2} />
    </group>
  )
}

export default function HoldScene({ onRelease }) {
  return (
    <>
      {/* near-field murk so the aisle recedes into nothing (the "hundreds") */}
      <fogExp2 attach="fog" args={['#06090b', 0.04]} />

      <HoldCameraRig />
      <Lighting />

      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -16]}>
        <planeGeometry args={[90, 100]} />
        <meshStandardMaterial color="#070809" roughness={1} metalness={0} />
      </mesh>

      {/* backlight — soft, fog-exempt discs behind the hero crate so it reads
          as a silhouette, exactly like the sketch: a wide halo + a hot core */}
      <mesh position={[0, 1.7, -4.6]}>
        <circleGeometry args={[8, 48]} />
        <meshBasicMaterial color="#bfeee2" transparent opacity={0.5} fog={false}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[0, 1.6, -4.4]}>
        <circleGeometry args={[3.2, 48]} />
        <meshBasicMaterial color="#e8fff8" transparent opacity={0.55} fog={false}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      <Keeper />
      <Crates onRelease={onRelease} />

      {/* The Signal's exact grade — desaturate, crush, faint CA, deep vignette.
          Reused verbatim so The Hold reads as the same author. */}
      <PostFX />
    </>
  )
}
