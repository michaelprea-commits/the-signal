import { useCallback, useEffect, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { applyVolumetricFog } from '../fx/fogPatch'

// The cathedral. It is not the mystery — it is the world.
// A colossal ruin standing off in the middle distance the way a mountain
// stands: unexplained, unexamined, permanent. It is a landscape feature,
// not a neighbouring building — it dominates the skyline so the signal
// can dominate the narrative.
//
// The GLB authors the structure ~31 units off-origin on X; the offset
// re-seats it. At 2× scale (~60 units tall) and well clear of the corridor,
// it emerges from haze over the whole journey and never resolves past
// a dark ghost with a hint of masonry.

const SCALE  = 2.6                 // raw mesh ≈ 30 units tall → ~78 world
const POS    = [0, 0, -46]
const OFFSET = [-16.3, 0, 0]       // body centre lands at world x ≈ 38

export function Cathedral() {
  const { gl } = useThree()
  const ktx2Ref = useRef(null)

  const extendLoader = useCallback((loader) => {
    if (!ktx2Ref.current) {
      ktx2Ref.current = new KTX2Loader()
      ktx2Ref.current.setTranscoderPath('/basis/')
      ktx2Ref.current.detectSupport(gl)
    }
    loader.setKTX2Loader(ktx2Ref.current)
  }, [gl])

  const gltf = useGLTF('/Models/my-model.glb', true, false, extendLoader)

  useEffect(() => {
    gltf.scene.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        applyVolumetricFog(child.material)
      }
    })
  }, [gltf.scene])

  return (
    <group position={POS} scale={SCALE}>
      <primitive object={gltf.scene} position={OFFSET} />
    </group>
  )
}
