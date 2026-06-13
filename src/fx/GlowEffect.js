import { Effect } from 'postprocessing'
import { Uniform, Vector2 } from 'three'

// Single-pass glow — zero additional render targets, no Metal/TBDR hazard.
//
// Pattern artifact history:
//   Radial 8×4        → visible X arms
//   Vogel disk 48     → discrete square cursors
//   Dual Kawase 4×4   → diagonal rainfall lines
//
// Root fix: per-pixel noise rotation. Each pixel's sample disk is rotated by
// hash(uv), so adjacent pixels have different orientations. The geometric
// pattern dissolves into soft isotropic noise that reads as natural atmospheric
// scatter — not an artifact, and appropriate for this scene's aesthetic.
//
// Samples: 12-point Poisson disk (good coverage, few taps, no clustering).

const fragmentShader = /* glsl */ `
  uniform vec2  uTexelSize;
  uniform float uThreshold;
  uniform float uSoftKnee;
  uniform float uIntensity;
  uniform float uRadius;

  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float glowWeight(vec3 rgb) {
    float lum  = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
    float knee = uThreshold * uSoftKnee;
    float rq   = clamp(lum - (uThreshold - knee), 0.0, 2.0 * knee);
    rq = (rq * rq) / (4.0 * knee + 0.0001);
    return clamp(max(rq, lum - uThreshold) / max(lum, 0.0001), 0.0, 1.0);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 scene = inputColor.rgb;

    // Per-pixel rotation — breaks any geometric sample pattern into soft noise.
    float angle = hash21(uv) * 6.28318530718;
    float ca = cos(angle), sa = sin(angle);

    // 12-point Poisson disk (unit radius).
    vec2 disk[12];
    disk[0]  = vec2(-0.3261, -0.4060);
    disk[1]  = vec2(-0.8396, -0.0740);
    disk[2]  = vec2(-0.6960,  0.4570);
    disk[3]  = vec2(-0.2030,  0.6213);
    disk[4]  = vec2( 0.9627, -0.1952);
    disk[5]  = vec2( 0.4734, -0.4802);
    disk[6]  = vec2( 0.5190,  0.7670);
    disk[7]  = vec2( 0.1853, -0.8932);
    disk[8]  = vec2( 0.5076,  0.0638);
    disk[9]  = vec2( 0.8966,  0.4120);
    disk[10] = vec2(-0.3221, -0.9332);
    disk[11] = vec2(-0.7920, -0.5984);

    vec3  glow = vec3(0.0);
    float wSum = 0.0;

    for (int i = 0; i < 12; i++) {
      // Rotate sample point by per-pixel angle.
      vec2 s = vec2(
        disk[i].x * ca - disk[i].y * sa,
        disk[i].x * sa + disk[i].y * ca
      );
      vec2 offset = s * uRadius * uTexelSize;
      vec4  tap   = texture2D(inputBuffer, uv + offset);
      float w     = glowWeight(tap.rgb);
      glow  += tap.rgb * w;
      wSum  += 1.0;
    }

    glow = (glow / wSum) * uIntensity;

    // SCREEN blend.
    vec3 result = 1.0 - (1.0 - scene) * (1.0 - glow);
    outputColor = vec4(result, inputColor.a);
  }
`

export class GlowEffect extends Effect {
  constructor({
    threshold = 0.25,
    softKnee  = 0.6,
    intensity = 2.8,
    radius    = 24.0,   // blur radius in pixels
  } = {}) {
    super('GlowEffect', fragmentShader, {
      uniforms: new Map([
        ['uTexelSize', new Uniform(new Vector2(1 / 1920, 1 / 1080))],
        ['uThreshold', new Uniform(threshold)],
        ['uSoftKnee',  new Uniform(softKnee)],
        ['uIntensity', new Uniform(intensity)],
        ['uRadius',    new Uniform(radius)],
      ]),
    })
  }

  setSize(width, height) {
    this.uniforms.get('uTexelSize').value.set(1 / width, 1 / height)
  }

  set threshold(v) { this.uniforms.get('uThreshold').value = v }
  set softKnee(v)  { this.uniforms.get('uSoftKnee').value  = v }
  set intensity(v) { this.uniforms.get('uIntensity').value = v }
  set radius(v)    { this.uniforms.get('uRadius').value    = v }
}
