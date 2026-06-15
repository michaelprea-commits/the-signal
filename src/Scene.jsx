import { Suspense, useLayoutEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { applyVolumetricFog, fogUniforms } from './fx/fogPatch'
import { CameraRig }       from './components/CameraRig'
import { DuskSky }         from './components/DuskSky'
import { Ground }          from './components/Ground'
import { Horizon }         from './components/Horizon'
import { Track }           from './components/Track'
import { TelegraphPoles }  from './components/TelegraphPoles'
import { Debris }          from './components/Debris'
import { Vegetation }      from './components/Vegetation'
import { Signal }          from './components/Signal'
import { Cathedral }       from './components/Cathedral'
import { Atmosphere }      from './components/Atmosphere'
import { PostFX }          from './components/PostFX'

const isMobile   = typeof window !== 'undefined' && window.innerWidth < 768
const SHADOW_MAP = isMobile ? 1024 : 2048

// ─── Lighting ─────────────────────────────────────────────────────────────────
// It is 25 minutes after sunset. The sun is completely gone.
// No directional sunlight. Only:
//   1. Hemisphere light — the residual blue-indigo sky above, dead earth below
//   2. A faint cool fill from directly above (open sky zenith)
//   3. Near-zero ambient
// The signal lamp is the only meaningful light source in the scene.
function Lighting() {
  return (
    <>
      {/* Sky dome: very faint blue-indigo top, near-black ground */}
      <hemisphereLight
        skyColor="#080520"
        groundColor="#030204"
        intensity={0.16}
      />

      {/* Zenith skylight — the last cold light from the open sky.
          Strong enough to put a cold sheen on the rail heads. */}
      <directionalLight
        color="#12103a"
        intensity={0.22}
        position={[0, 20, 5]}
        castShadow
        shadow-mapSize={[SHADOW_MAP, SHADOW_MAP]}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-bias={-0.001}
      />

      {/* Afterglow fill — the warm residue on the western horizon.
          Extremely faint; just enough to not lose the ground completely. */}
      <directionalLight
        color="#3a1206"
        intensity={0.06}
        position={[-25, 2, -30]}
      />

      {/* Cathedral atmospheric wrap — two ghost-of-atmosphere sources that
          reveal stone plane normals without reading as a light source.
          Upper-left-far: the blue residue of the sky above the far horizon.
          Right-and-behind: the atmospheric afterglow the stones would catch
          from a horizon they face. Near objects are unaffected — at intensity
          < 0.10 with near-black colours the signal's 20–30 unit lamps dominate. */}
      <directionalLight color="#14102c" intensity={0.09} position={[-80, 70, -220]} />
      <directionalLight color="#1a0c24" intensity={0.07} position={[140, 8, -200]} />

      <ambientLight color="#06040e" intensity={0.09} />
    </>
  )
}

// Patches every fogging material in the scene with the volumetric fog
// chunks (height falloff + drifting noise + dual colour) and drives the
// shared fogTime uniform. Re-traverses briefly to catch the async GLB.
function VolumetricFog() {
  const scene = useThree(s => s.scene)

  useLayoutEffect(() => {
    const patchAll = () => scene.traverse(obj => {
      if (!obj.material) return
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      mats.forEach(applyVolumetricFog)
    })
    patchAll()
    const id = setInterval(patchAll, 1000)
    const stop = setTimeout(() => clearInterval(id), 8000)
    return () => { clearInterval(id); clearTimeout(stop) }
  }, [scene])

  useFrame(({ clock }) => { fogUniforms.fogTime.value = clock.elapsedTime })
  return null
}

export default function Scene() {
  return (
    <>
      {/* Global fog sets the *floor* of visibility — near-field dissolution
          only. The fogPatch chunks give it height falloff, drifting noise
          density and dual colour; base density is set a step higher since
          noise and altitude locally REDUCE it. The heavy, uneven
          obscuration is still the Atmosphere banks; kilometre-scale depth
          is the matte horizon layers. */}
      {/* Base fog: shifted slightly warmer so near/far have visible colour separation */}
      <fogExp2 attach="fog" args={['#0e0a24', 0.032]} />
      <VolumetricFog />

      <CameraRig />
      <Lighting />
      <DuskSky />
      <Horizon />
      <Ground />

      <Track position={[0, 0, 9]} />
      <TelegraphPoles />
      <Debris />
      <Vegetation />

      {/* The mystery: a small railway signal beside the line (procedural). */}
      <Signal />

      {/* The world: the cathedral standing off the corridor like a mountain —
          a skyline event, never an explanation. */}
      <Suspense fallback={null}>
        <Cathedral />
      </Suspense>

      <Atmosphere />
      <PostFX />
    </>
  )
}
