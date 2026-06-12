import { useMemo } from 'react'
import * as THREE from 'three'

// Gloaming sky — 20 to 30 minutes after sunset.
// The sun is gone. Only afterglow remains: a thin warm band compressed
// against the horizon. Everything above is deep indigo collapsing into
// near-black, with the first faint stars.
// References: Close Encounters night exteriors, Stålenhag twilight paintings,
// The Vast of Night.

const vertexShader = /* glsl */ `
  varying vec3 vWorldDir;
  void main() {
    vWorldDir = normalize((modelMatrix * vec4(position, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vWorldDir;

  // Gloaming palette — all values in linear light, not gamma
  const vec3 COL_ZENITH = vec3(0.006, 0.003, 0.028);   // near-black indigo
  const vec3 COL_UPPER  = vec3(0.014, 0.008, 0.078);   // dark indigo
  const vec3 COL_MID    = vec3(0.032, 0.014, 0.155);   // deep blue-violet
  const vec3 COL_LOW    = vec3(0.055, 0.020, 0.210);   // indigo, just above horizon
  const vec3 COL_GLOW   = vec3(0.380, 0.088, 0.026);   // afterglow — warm but muted
  const vec3 COL_HORI   = vec3(0.180, 0.038, 0.008);   // base of afterglow
  const vec3 COL_GROUND = vec3(0.065, 0.018, 0.004);   // below-horizon dark orange

  // Afterglow direction — the horizon where the sun set (matches light position)
  const vec3 GLOW_DIR = normalize(vec3(-0.638, 0.0, -0.763));

  float ss(float a, float b, float x) {
    float t = clamp((x - a) / (b - a), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
  }

  float hash3(vec3 p) {
    p = fract(p * 0.3183 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec3 n = normalize(vWorldDir);
    float h = n.y;

    // Sky gradient — the warm band is extremely narrow (h = 0.0 to 0.028)
    vec3 sky;
    if      (h < -0.06)  sky = COL_GROUND;
    else if (h < 0.0)    sky = mix(COL_GROUND, COL_HORI,  ss(-0.06, 0.00, h));
    else if (h < 0.012)  sky = mix(COL_HORI,   COL_GLOW,  ss(0.000, 0.012, h));
    else if (h < 0.030)  sky = mix(COL_GLOW,   COL_LOW,   ss(0.012, 0.030, h));
    else if (h < 0.10)   sky = mix(COL_LOW,    COL_MID,   ss(0.030, 0.100, h));
    else if (h < 0.38)   sky = mix(COL_MID,    COL_UPPER, ss(0.100, 0.380, h));
    else                 sky = mix(COL_UPPER,   COL_ZENITH,ss(0.380, 1.000, h));

    // Directional afterglow — warm blush concentrated on the western horizon
    float horizonMask = max(0.0, 1.0 - abs(h) * 12.0);  // only near h=0
    float glowDot = max(dot(n, GLOW_DIR), 0.0);
    sky += vec3(0.22, 0.045, 0.008) * pow(glowDot, 3.5) * horizonMask;

    // First stars — sparse, faint, only well above the horizon where the
    // sky has gone dark enough for them to surface
    float star = smoothstep(0.99935, 1.0, hash3(floor(n * 480.0)));
    star *= ss(0.12, 0.40, h);
    sky += vec3(0.50, 0.55, 0.72) * star * 0.30;

    // Blue-noise-ish dither — kills banding in the long dark gradients
    sky += (hash2(gl_FragCoord.xy) - 0.5) * (1.6 / 255.0);

    gl_FragColor = vec4(sky, 1.0);
  }
`

export function DuskSky() {
  const material = useMemo(
    () => new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
    }),
    []
  )

  return (
    <mesh material={material} renderOrder={-1}>
      <sphereGeometry args={[750, 32, 16]} />
    </mesh>
  )
}
