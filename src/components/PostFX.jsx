import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  HueSaturation,
  BrightnessContrast,
  Vignette,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'

const CA_OFFSET = new Vector2(0.00035, 0.0002)

// No GodRays pass: a full-screen radial resample of a flickering source
// produced frame-wide light flashes, and the halo/air-glow sprites already
// do its narrative job. Restraint won.
export function PostFX() {
  return (
    <EffectComposer multisampling={0}>
      {/* Bloom — the dominant effect. With the scene this dark, even a moderate
          emissive object halos dramatically. The large radius creates atmospheric
          scatter — light appears to be diffusing through fog. */}
      <Bloom
        intensity={3.0}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.7}
        radius={1.0}
        blendFunction={BlendFunction.SCREEN}
      />

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
