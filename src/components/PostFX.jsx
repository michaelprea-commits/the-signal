import {
  EffectComposer,
  ChromaticAberration,
  HueSaturation,
  BrightnessContrast,
  Vignette,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'

const CA_OFFSET = new Vector2(0.00035, 0.0002)

// No GodRays: full-screen radial resample of a flickering source = frame-wide
// light flashes. Halo/air-glow sprites already do its narrative job.
//
// No library Bloom: postprocessing's Bloom allocates its own mip-chain render
// targets. On Apple Silicon (Metal/TBDR), those targets use MTLLoadActionDontCare
// — tile memory is undefined, not zero. On frames where any tile escapes the blur
// kernel, the undefined value (often white) propagates to full-screen white.
// Confirmed: strobe persists even at luminanceThreshold=10 (nothing blooming),
// proving the bug is in the pass infrastructure, not scene content.
//
// No custom GlowEffect: discrete sampling in a 200:1 contrast scene (lamp
// emissiveIntensity=4 vs background ~0.02) produces cursor-like artifacts at
// the glow boundary regardless of sample count or radius. Eliminating this
// requires ~450 samples to bring individual transitions below the JND —
// not practical. The halo (scale 5.5) and air-glow (scale 12) sprites already
// provide smooth, artifact-free atmospheric scatter from the lamp.
export function PostFX() {
  return (
    <EffectComposer multisampling={0}>

      {/* Grade: gently desaturated, slightly crushed — closer to print than
          to screen. Keeps the lamp colour the only saturated thing alive. */}
      <HueSaturation saturation={-0.12} />
      <BrightnessContrast brightness={-0.015} contrast={0.08} />

      {/* Chromatic aberration: barely there — a lens struggling with the dark,
          not an effect asking to be noticed */}
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={CA_OFFSET}
        radialModulation
        modulationOffset={0.4}
      />

      {/* Vignette: deep darkness at the frame edges — the light is all there is */}
      <Vignette
        eskil={false}
        offset={0.18}
        darkness={0.9}
      />

      {/* No film grain: a per-frame white-noise texture over the whole
          viewport reads as full-screen flicker in a scene this dark.
          Banding is handled by the sky shader's dither and the fog noise. */}
    </EffectComposer>
  )
}
