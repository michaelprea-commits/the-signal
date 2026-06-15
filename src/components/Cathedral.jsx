import { useCallback, useEffect, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { applyVolumetricFog } from '../fx/fogPatch'

// The cathedral. It is not the mystery — it is the world.
// A colossal ruin standing off the way a cooling tower stands across a valley:
// enormous, unexplained, permanent. It should dominate the skyline so the
// signal can dominate the narrative. The structure must never feel adjacent —
// it is a landscape event, not a neighbouring building.
//
// Distance: z=-160. From the final camera position (z=3.5), depth=163.5 units.
// At that depth the base is completely dissolved into ground haze; the upper
// silhouette is ~36% visible — a landmark across a valley, not a structure
// beside the track. Three atmosphere curtain planes fill the z=-35→-110 gap,
// ensuring signal and cathedral breathe different air.
//
// X: world x ≈ 100. The signal sits at x=2.2. The centre 98 units right
// puts the cathedral solidly in the right portion of the frame, partially
// off-screen at the final camera position — present but not explaining itself.
// SCALE=4.9 (70% of 7.0): angular footprint reduced without the model's
// wide left-side geometry flooding the centre frame.
// Y=-6 embeds the base below the dune surface at this depth and x offset.
//
// X-offset math: GLB content centre is at +30.9 in model space.
// world_x = (OFFSET_x + 30.9) × SCALE = (-10.5 + 30.9) × 4.9 ≈ 100

const SCALE  = 4.9                 // 70% of 7.0 — smaller angular footprint
const POS    = [0, -6, -160]       // y=-6 embeds base into dune terrain at this depth
const OFFSET = [-10.5, 0, 0]      // body centre at world x ≈ 100 — right of frame

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
      if (!child.isMesh) return
      child.castShadow = true
      child.receiveShadow = true

      const mats = Array.isArray(child.material) ? child.material : [child.material]
      mats.forEach((mat, i) => {
        applyVolumetricFog(mat)

        // Lift material ~20% so stone surfaces respond to the ambient sky.
        // Emissive is a dark warm-purple: the colour the stones absorb from
        // the horizon and radiate back — gives surface normals a tonal range
        // without introducing any readable light source. Still very dark;
        // the fog claims 80–100% of what shows through. Just enough for form.
        const lifted = mat.clone()
        if (lifted.color) lifted.color.multiplyScalar(1.20)
        if (lifted.emissive !== undefined) {
          lifted.emissive = new THREE.Color(0x1e1540)
          lifted.emissiveIntensity = 0.90
        }
        lifted.needsUpdate = true
        if (Array.isArray(child.material)) child.material[i] = lifted
        else child.material = lifted
      })
    })
  }, [gltf.scene])

  return (
    <group position={POS} scale={SCALE}>
      <primitive object={gltf.scene} position={OFFSET} />
    </group>
  )
}
