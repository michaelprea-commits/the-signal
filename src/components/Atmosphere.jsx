import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Mist curtains ───────────────────────────────────────────────────────────
// The global fog is uniform — these are not. Six large noise-animated planes
// stand across the route. The camera walks through them; the signal light
// brightens, dims, and vanishes behind them as their density drifts.
// This is what makes visibility *uncertain* rather than merely limited.

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uFade;
  uniform float uSeed;
  uniform vec2  uScale;
  uniform vec3  uColor;
  varying vec2  vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i),                 hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 p = vUv * uScale + vec2(uSeed * 7.3, uSeed * 3.1);
    p.x += uTime * 0.014;
    p.y += uTime * 0.004;
    float n = fbm(p);

    // Soft lateral edges; height-fog profile vertically — densest at the
    // base, thinning exponentially with altitude. Real ground fog pools.
    float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
    float band = smoothstep(0.0, 0.06, vUv.y) * pow(1.0 - vUv.y, 1.6);

    gl_FragColor = vec4(uColor, n * n * edge * band * uFade);
  }
`

// [z, base density] — banks along the whole route, DENSER toward the signal.
// For ~80% of the journey the structure stays buried in these; each bank
// only dissolves as the camera physically reaches it, so the signal is
// unreadable until the final approach — and even the reveal keeps a veil.
//
// The three deep-field planes (z=-35, -70, -110) fill the gap between the
// signal's immediate atmosphere and the cathedral at z=-160. The camera
// never reaches them so approach=1 always; they are permanent haze layers
// ensuring signal and cathedral breathe different air.
const CURTAINS = [
  [64, 0.40],
  [52, 0.44],
  [41, 0.50],
  [30, 0.42],
  [20, 0.38],
  [12, 0.34],
  [6,  0.28],
  [0,  0.22],
  [-9,  0.45],
  [-15, 0.50],  // thickened: the veil behind the signal, before the deep field
  [-35, 0.55],  // deep field — atmospheric separation layer 1
  [-70, 0.60],  // deep field — atmospheric separation layer 2
  [-110, 0.54], // deep field — atmospheric separation layer 3
]

// Stratified haze — vast static gradient banks between the distant matte
// layers. They put "air" behind every silhouette: aerial perspective the
// exponential fog can't provide at those distances.
// The near stratum (z=-20) is a thin knee-height band that separates the
// signal from the signal box depth, creating a foreground / mid / distance
// read without increasing global density.
// [z, y, width, height, density]
const STRATA = [
  [-20, 1.5, 180,  6, 0.16],  // near — knee-height separation, signal to signal box
  [-70,  8,  500,  30, 0.26],
  [-200, 14, 1100, 60, 0.32],
  [-420, 24, 1500, 110, 0.40],
]

// Ground mist — low sheets lying over the corridor, drifting slowly.
// Seen obliquely from eye height they read as the thin breath that hangs
// over cold ground at dusk. They cover the WHOLE walk: the camera is
// always looking through this layer, never merely at it.
// Foreground entries (z=4 and z=-10) pool mist right around the signal
// base — the viewer is always looking through this layer, creating layered
// depth between camera, signal, and the deeper field.
// [z, density]
const GROUND_MIST = [
  [68, 0.14],
  [52, 0.16],
  [30, 0.16],
  [12, 0.14],
  [ 4, 0.20],  // foreground — camera end, pools around signal base
  [-6, 0.18],
  [-10, 0.16], // near-mid — separates signal from signal box depth
]

function Curtain({ z, density, seed }) {
  const matRef = useRef()

  const uniforms = useMemo(() => ({
    uTime:  { value: 0 },
    uFade:  { value: density },
    uSeed:  { value: seed },
    // Fine enough that close banks read as drifting mist, never as masonry
    uScale: { value: new THREE.Vector2(7.5, 1.8) },
    // Lifted warmer violet: adds luminosity, less opaque-wall-of-dark
    uColor: { value: new THREE.Color('#221a4e') },
  }), [density, seed])

  useFrame(({ clock, camera }) => {
    const u = matRef.current.uniforms
    u.uTime.value = clock.elapsedTime
    // Dissolve as the camera reaches the plane so we never clip a hard sheet
    const approach = THREE.MathUtils.clamp((camera.position.z - z - 2) / 6, 0, 1)
    // Slow breathing — banks thicken and thin on their own. Deep swing:
    // silhouettes behind them oscillate in and out of legibility.
    const breathe = 0.55 + 0.45 * Math.sin(clock.elapsedTime * 0.11 + seed * 9.0)
    u.uFade.value = density * approach * breathe
  })

  return (
    <mesh position={[0, 7.5, z]}>
      <planeGeometry args={[140, 20]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}

function GroundMist({ z, density, seed }) {
  const matRef = useRef()

  const uniforms = useMemo(() => ({
    uTime:  { value: 0 },
    uFade:  { value: density },
    uSeed:  { value: seed },
    uScale: { value: new THREE.Vector2(7.0, 3.0) },
    // Slightly warm — near air carries the ground's residue. The far
    // strata run cooler: chromatic separation is a depth cue.
    // Lifted warmer: ground mist reads as breathable air, not dark ink
    uColor: { value: new THREE.Color('#261c48') },
  }), [density, seed])

  useFrame(({ clock }) => {
    const u = matRef.current.uniforms
    u.uTime.value = clock.elapsedTime * 0.7
    u.uFade.value = density * (0.75 + 0.25 * Math.sin(clock.elapsedTime * 0.08 + seed * 11.0))
  })

  return (
    <mesh position={[0, 0.55, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[120, 40]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function Stratum({ z, y, width, height, density, seed }) {
  const matRef = useRef()

  const uniforms = useMemo(() => ({
    uTime:  { value: 0 },
    uFade:  { value: density },
    uSeed:  { value: seed },
    // Long horizontal wisps — distant haze stratifies, it doesn't clump.
    // Cooler than the near mist: colour falls off with distance.
    uScale: { value: new THREE.Vector2(18.0, 2.6) },
    // Lifted: distant strata need to be distinguishable from the black sky
    uColor: { value: new THREE.Color('#16103e') },
  }), [density, seed])

  useFrame(({ clock }) => {
    const u = matRef.current.uniforms
    u.uTime.value = clock.elapsedTime * 0.4 // distant air moves slower
    u.uFade.value = density * (0.8 + 0.2 * Math.sin(clock.elapsedTime * 0.05 + seed * 7.0))
  })

  return (
    <mesh position={[0, y, z]}>
      <planeGeometry args={[width, height]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}

// ─── Dust ────────────────────────────────────────────────────────────────────
// Near-field suspended dust — gives the air a body. Fogged, so only the motes
// around the camera read; the rest dissolve like everything else here.
function Dust() {
  const ref = useRef()

  const geometry = useMemo(() => {
    const count = 420
    // Deterministic scatter — same dust every visit, and keeps render pure
    const rand = (i, k) => {
      const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
      return s - Math.floor(s)
    }
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = rand(i, 1) * 26 - 13
      positions[i * 3 + 1] = rand(i, 2) * 4.5 + 0.2
      positions[i * 3 + 2] = rand(i, 3) * 82 - 10
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  useFrame(({ clock }) => {
    ref.current.position.x = Math.sin(clock.elapsedTime * 0.05) * 0.6
    ref.current.position.y = Math.sin(clock.elapsedTime * 0.07) * 0.15
  })

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        size={0.035}
        sizeAttenuation
        color="#8a7050"
        transparent
        opacity={0.30}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export function Atmosphere() {
  return (
    <group>
      {CURTAINS.map(([z, density], i) => (
        <Curtain key={i} z={z} density={density} seed={i * 0.37 + 0.21} />
      ))}
      {STRATA.map(([z, y, w, h, density], i) => (
        <Stratum key={`s${i}`} z={z} y={y} width={w} height={h} density={density} seed={i * 0.61 + 0.13} />
      ))}
      {GROUND_MIST.map(([z, density], i) => (
        <GroundMist key={`g${i}`} z={z} density={density} seed={i * 0.83 + 0.41} />
      ))}
      <Dust />
    </group>
  )
}
