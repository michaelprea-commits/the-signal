import { useEffect, useMemo, useRef, Suspense } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture, useVideoTexture, MeshReflectorMaterial, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { panels } from './homeData'
import { homeState } from './homeState'

// Homepage stage — a continuous HOOP of curved video screens on a round
// reflective plinth, matching the live michaelreadesign.com showcase. Every
// screen is a segment of ONE big ring (so the curvature is shared and gentle),
// faced with its video and backed by a dark frame — so the near wall shows the
// projects and the far wall shows the black reverses curving over the top. The
// frame gives each screen a curved-TV thickness. Scroll spins the hoop.
const N = panels.length
const R = 7.5            // ring radius == each screen's curvature (one continuous hoop, 15% wider)
const SW = 7.2           // screen width (wider → smaller gaps, more continuous wall)
const SH = 3.45          // screen height
const W = SW / R         // angular width of each screen on the ring
const STEP = (Math.PI * 2) / N
const STAGE_R = R + 3.5
const CAM_Y = 3.5        // camera base height (parallax + idle bob play around this)
const FLOAT = 1.9        // hoop floats just above the plinth (lifted off the ground)
const HOOP_PITCH = -0.03 // ring tipped forward slightly: the back drops lower than the front
const HOOP_ROLL = -0.05  // subtle anticlockwise roll about the view axis

function prep(tex) { tex.colorSpace = THREE.SRGBColorSpace; return tex }

// One screen: a dark frame (double-sided — its outer face borders the video, its
// inner face is the black reverse seen on the far wall) + the video on the
// outer/convex face, sitting slightly proud for a curved-TV thickness.
function ScreenMesh({ tex, matRef }) {
  return (
    <>
      <mesh position={[0, 0, -R - 0.05]} castShadow>
        <cylinderGeometry args={[R, R, SH + 0.24, 64, 1, true, -W / 2 - 0.04, W + 0.08]} />
        <meshStandardMaterial color="#080a0c" metalness={0.45} roughness={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -R]}>
        <cylinderGeometry args={[R, R, SH, 64, 1, true, -W / 2, W]} />
        <meshStandardMaterial ref={matRef} map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={1.12} roughness={1} metalness={0} side={THREE.FrontSide} toneMapped={false} />
      </mesh>
    </>
  )
}

function ImageScreen({ src, matRef }) { const tex = useTexture(src); useMemo(() => prep(tex), [tex]); return <ScreenMesh tex={tex} matRef={matRef} /> }
function VideoScreen({ src, matRef }) { const tex = useVideoTexture(src, { muted: true, loop: true, start: true, playsInline: true, crossOrigin: 'anonymous' }); useMemo(() => prep(tex), [tex]); return <ScreenMesh tex={tex} matRef={matRef} /> }

export function HomeScene() {
  const { camera } = useThree()
  const ring = useRef()
  const mats = useRef([])
  const hoop = useRef()
  const intro = useRef(null)
  const screens = useRef([])
  const hovered = useRef(-1)

  useEffect(() => () => { document.body.style.cursor = '' }, [])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const time = state.clock.elapsedTime

    // entrance — the hoop scales, descends and spins into place once the
    // loader hands off (homeState.ready)
    if (intro.current === null && homeState.ready) intro.current = time
    const e = intro.current === null ? 0 : 1 - Math.pow(1 - THREE.MathUtils.clamp((time - intro.current) / 1.6, 0, 1), 3)
    if (hoop.current) {
      hoop.current.scale.setScalar(0.93 + 0.07 * e)
      hoop.current.position.y = FLOAT + (1 - e) * 1.3
    }

    homeState.smooth = THREE.MathUtils.damp(homeState.smooth, homeState.progress, 3, dt)
    const t = homeState.smooth
    if (ring.current) ring.current.rotation.y = -t * (N - 1) * STEP + (1 - e) * 0.6
    homeState.active = Math.round(THREE.MathUtils.clamp(t, 0, 1) * (N - 1))

    // active-screen focus — the front project burns bright, the rest recede;
    // a hovered screen lifts above its resting level and pops slightly
    const ringRot = ring.current ? ring.current.rotation.y : 0
    for (let i = 0; i < N; i++) {
      const m = mats.current[i]
      if (!m) continue
      let a = i * STEP + ringRot
      a = Math.atan2(Math.sin(a), Math.cos(a))
      const f = 1 - THREE.MathUtils.clamp(Math.abs(a) / (STEP * 1.8), 0, 1)
      const hov = hovered.current === i
      m.emissiveIntensity = THREE.MathUtils.damp(m.emissiveIntensity, 0.4 + 0.85 * f * f + (hov ? 0.3 : 0), 6, dt)
      const g = screens.current[i]
      if (g) g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, hov ? 1.03 : 1, 8, dt))
    }

    // scroll dolly — the ring starts small & centred, zooms in over the first
    // beat and settles to the RIGHT (clear space on the left for the copy), on a
    // low, upward, epic angle. Plus mouse parallax + idle breathing.
    const zoomT = THREE.MathUtils.smoothstep(t, 0, 0.14)
    const panX = THREE.MathUtils.lerp(0, -3.6, zoomT)
    const camZ = THREE.MathUtils.lerp(29, 18, zoomT)
    const tx = panX + state.pointer.x * 0.8 + Math.sin(time * 0.25) * 0.16
    const ty = CAM_Y + state.pointer.y * 0.45 + Math.sin(time * 0.32) * 0.12
    camera.position.x = THREE.MathUtils.damp(camera.position.x, tx, 2.2, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, ty, 2.2, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, camZ, 2.2, dt)
    camera.lookAt(panX, 1.5, 0)
  })

  return (
    <>
      <fog attach="fog" args={['#060608', 12, 32]} />
      <ambientLight intensity={0.7} />
      {/* key light pool from above — a visible source over the stage */}
      <spotLight
        position={[0, 14, 4]} angle={0.62} penumbra={0.85} intensity={2.6} decay={0}
        color="#fff6e8" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}
      />
      <directionalLight position={[-8, 5, 4]} intensity={0.32} color="#9fb6c2" />
      {/* rim light from behind — a faint neutral edge, just enough to separate */}
      <directionalLight position={[0, 8, -16]} intensity={0.3} color="#cdd2d8" />
      {/* warm spill from the front (active) screen onto the stage */}
      <pointLight position={[0, 1.6, 6.5]} intensity={22} distance={12} decay={2} color="#ffcf96" />

      {/* fake volumetric shaft under the key light — additive cone through the dust */}
      <mesh position={[0, 7.2, 1.8]}>
        <coneGeometry args={[7, 13.5, 48, 1, true]} />
        <meshBasicMaterial color="#fff3dd" transparent opacity={0.045} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} fog={false} />
      </mesh>

      {/* drifting dust motes — atmosphere */}
      <Sparkles count={70} scale={[30, 18, 26]} position={[0, 7, 0]} size={1.8} speed={0.14} opacity={0.6} color="#ffe6c2" noise={0.5} />

      {/* the hoop of screens — floated above the plinth and leaned toward the camera */}
      <group ref={hoop} position={[0, FLOAT, 0]} rotation={[HOOP_PITCH, 0, HOOP_ROLL]}>
        <group ref={ring}>
          {panels.map((p, i) => (
            <group key={i} rotation={[0, i * STEP, 0]}>
              <group
                position={[0, 0, R]}
                ref={(el) => (screens.current[i] = el)}
                onPointerOver={(e) => { e.stopPropagation(); hovered.current = i; document.body.style.cursor = 'pointer' }}
                onPointerOut={() => { if (hovered.current === i) { hovered.current = -1; document.body.style.cursor = '' } }}
                onClick={(e) => { e.stopPropagation(); window.location.href = p.href }}
              >
                <Suspense fallback={null}>
                  {p.video
                    ? <VideoScreen src={p.video} matRef={(m) => (mats.current[i] = m)} />
                    : <ImageScreen src={p.img} matRef={(m) => (mats.current[i] = m)} />}
                </Suspense>
              </group>
            </group>
          ))}
        </group>
      </group>

      {/* round plinth + its reflective top */}
      <mesh position={[0, -0.25, 0]} receiveShadow>
        <cylinderGeometry args={[STAGE_R, STAGE_R + 0.15, 0.5, 96]} />
        <meshStandardMaterial color="#15151a" metalness={0.45} roughness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <circleGeometry args={[STAGE_R, 96]} />
        <MeshReflectorMaterial
          blur={[40, 16]} resolution={1024} mixBlur={0.7} mixStrength={80} roughness={0.12}
          depthScale={1.1} minDepthThreshold={0.3} maxDepthThreshold={1.2} color="#16161b" metalness={0.8} fog={false}
        />
      </mesh>
    </>
  )
}
