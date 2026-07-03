import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instances, Instance, useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'

export const GLOW = '#1fb89b'
const CRATE = '/hold/crate/crate.glb'
const S = 1.5            // GLB crate is ~1 unit tall; scale up to ~1.5
const H = 1.05 * S       // crate height (lid top) — used for stacking the rack
useGLTF.preload(CRATE)

// The rack: two rows either side of the aisle, two tiers, receding into fog.
// The GLB body + lid are each instanced (two draw calls for the whole yard).
function useRack() {
  return useMemo(() => {
    const out = []
    const rowsX = [-4.7, -2.4, 2.4, 4.7]
    let id = 38
    for (let zi = 0; zi < 18; zi++) {
      const zz = -2.6 - zi * 2.3
      rowsX.forEach((x, ri) => {
        out.push({ id: id++, position: [x, 0, zz], scale: S, ry: (ri - 1.5) * 0.05 })
        if ((zi + ri) % 2 === 0) out.push({ id: id++, position: [x, H, zz], scale: S * 0.96, ry: 0 })
      })
    }
    return out
  }, [])
}

// A worn vinyl label, mounted ~1mm proud of the crate face.
function Sticker({ src, position, rotation, size }) {
  const tex = useTexture(src)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshStandardMaterial
        map={tex} transparent alphaTest={0.03} roughness={0.5} metalness={0}
        polygonOffset polygonOffsetFactor={-2}
      />
    </mesh>
  )
}

// Hero crate — "specimen 037". Real GLB crate + wrenched-open lid, the contained
// glow escaping the gap, and stickers on each visible face. The glow breathes
// per the flicker rule (scene never strobes; character lives on the glow only).
function HeroCrate({ geo, lid, mat, onRelease }) {
  const glowRef = useRef()
  const lightRef = useRef()

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const pulse = 0.78 + 0.18 * (0.5 + 0.5 * Math.sin(t * 0.6)) + 0.04 * Math.sin(t * 3.7 + 1.1)
    if (glowRef.current) glowRef.current.material.opacity = 0.9 * pulse
    if (lightRef.current) lightRef.current.intensity = 16 * pulse
  })

  const pick = (e) => { e.stopPropagation(); onRelease(new THREE.Vector3(0, 0.9, 0)) }
  const over = (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }
  const out = () => { document.body.style.cursor = '' }

  const face = 0.4405 * S, side = 0.4626 * S, mid = 0.5 * S

  return (
    <group onClick={pick} onPointerOver={over} onPointerOut={out}>
      <mesh geometry={geo} material={mat} scale={S} />
      {/* lid wrenched open on its back-top edge */}
      <group position={[0, 0.99 * S, -0.44 * S]} rotation={[-0.5, 0, 0]}>
        <mesh geometry={lid} material={mat} scale={S} position={[0, -0.99 * S, 0.44 * S]} />
      </group>
      {/* worn vinyl labels, proud of each visible face */}
      <Sticker src="/hold/crate/stickers/turn-10.png" position={[0, mid, face + 0.012]} rotation={[0, 0, 0]} size={[0.62 * S, 0.62 * S]} />
      <Sticker src="/hold/crate/stickers/turn-10.png" position={[side + 0.012, mid, 0]} rotation={[0, Math.PI / 2, 0]} size={[0.58 * S, 0.58 * S]} />
      <Sticker src="/hold/crate/stickers/turn-10.png" position={[-side - 0.012, mid, 0]} rotation={[0, -Math.PI / 2, 0]} size={[0.58 * S, 0.58 * S]} />
      {/* contained glow + the one meaningful light near the crate */}
      <mesh ref={glowRef} position={[0, 1.0 * S, 0.12]}>
        <planeGeometry args={[0.8 * S, 0.6 * S]} />
        <meshBasicMaterial color={GLOW} transparent opacity={0.9} fog={false} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight ref={lightRef} position={[0, 1.0 * S, 0]} color={GLOW} intensity={16} distance={13} decay={2} />
    </group>
  )
}

function CratesInner({ onRelease }) {
  const { nodes, materials } = useGLTF(CRATE)
  const geo = nodes['wooden_crate_02'].geometry
  const lid = nodes['wooden_crate_lid_02'].geometry
  const mat = materials['Material.004']
  const rack = useRack()

  const pickInstance = (c) => (e) => {
    e.stopPropagation()
    onRelease(new THREE.Vector3(c.position[0], c.position[1] + 0.7, c.position[2]))
  }

  return (
    <>
      <HeroCrate geo={geo} lid={lid} mat={mat} onRelease={onRelease} />

      {/* rack — bodies (one draw call) */}
      <Instances geometry={geo} material={mat} limit={rack.length}>
        {rack.map((c) => (
          <Instance
            key={c.id} position={c.position} scale={c.scale} rotation={[0, c.ry, 0]}
            onClick={pickInstance(c)}
            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
            onPointerOut={() => { document.body.style.cursor = '' }}
          />
        ))}
      </Instances>

      {/* rack — lids, closed (one draw call) */}
      <Instances geometry={lid} material={mat} limit={rack.length}>
        {rack.map((c) => (
          <Instance key={c.id} position={c.position} scale={c.scale} rotation={[0, c.ry, 0]} />
        ))}
      </Instances>
    </>
  )
}

export function Crates({ onRelease }) {
  return (
    <Suspense fallback={null}>
      <CratesInner onRelease={onRelease} />
    </Suspense>
  )
}
