import { useMemo } from 'react'
import * as THREE from 'three'

const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
const RES = isMobile ? 80 : 110

export function Ground() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(600, 600, RES, RES)
    const pos = geo.attributes.position

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const zWorld = -y // plane is rotated -90° about X: local +y → world −z

      // Flat corridor along the whole route (track runs down the plane's
      // local y / world z axis) — dunes rise toward the lateral edges
      const flatZone = Math.max(0, 1 - Math.abs(x) / 24)
      const duneBlend = (1 - flatZone) * (1 - flatZone)

      const large  = Math.sin(x * 0.030 + 0.40) * Math.cos(y * 0.025)           * 3.2
      const medium = Math.sin(x * 0.080 - y * 0.045 + 1.0) * Math.cos(y * 0.06) * 1.6
      const fine   = Math.sin(x * 0.160 + y * 0.110 + 2.3)                       * 0.55

      // The drift — a sand ridge blown across the corridor at z≈38.
      // Height 2.4: enough to occlude the signal lamp's sight-line from
      // t≈0.17 (z≈56) through t≈0.37 (camera crests at y=3.00, 0.6m
      // above ridge top). Peak mystery falls at 25–35% scroll.
      // The air-glow sprite (scale 12) protrudes above the ridge silhouette
      // in screen space, producing the "city behind a hill" atmospheric
      // linger before and after full occlusion.
      // Signal point lights are faded in Signal.jsx during this window to
      // prevent illumination bleeding through the terrain.
      const dz = (zWorld - 38) / 5.0
      const dx = x / 16
      const drift = 2.4 * Math.exp(-(dz * dz)) * Math.exp(-(dx * dx))

      pos.setZ(i, (large + medium + fine) * duneBlend + drift)
    }

    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial
        color="#100c08"
        roughness={0.98}
        metalness={0.0}
      />
    </mesh>
  )
}
