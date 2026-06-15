import * as THREE from 'three'

// Volumetric-feeling fog — the snayss.medium.com "Three.js fog hacks"
// technique: keep standard materials (and the scene's FogExp2 wiring) but
// replace the fog shader chunks via onBeforeCompile. Three additions:
//
//   1. HEIGHT FALLOFF — fog density pools at ground level and thins with
//      altitude. Tall silhouettes rise out of a fog sea (BR2049 Vegas).
//   2. DRIFTING NOISE — 3D value noise modulates density through world
//      space and drifts with time. The fog is patchy and alive; visibility
//      varies across the scene rather than by distance alone.
//   3. DUAL COLOUR — near fog is a warmer violet than the deep-indigo far
//      fog, so depth reads chromatically as well as tonally.
//
// All patched materials share these uniform OBJECTS, so advancing
// fogUniforms.fogTime.value once per frame animates every material.

export const fogUniforms = {
  fogTime:        { value: 0 },
  // Near fog: warmer, lighter violet. Creates luminous dusty quality and
  // gives the near/far gradient visible colour temperature separation.
  fogNearColor:   { value: new THREE.Color('#2a1c50') },
  fogNoiseFreq:   { value: 0.05 },
  fogNoiseSpeed:  { value: 0.05 },
  fogNoiseImpact: { value: 0.45 },
}

const FOG_PARS_VERTEX = /* glsl */ `
#ifdef USE_FOG
  varying float vFogDepth;
  varying vec3 vFogWorldPosition;
#endif
`

const FOG_VERTEX = /* glsl */ `
#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  vFogWorldPosition = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
#endif
`

const FOG_PARS_FRAGMENT = /* glsl */ `
#ifdef USE_FOG
  uniform vec3 fogColor;
  uniform vec3 fogNearColor;
  uniform float fogTime;
  uniform float fogNoiseFreq;
  uniform float fogNoiseSpeed;
  uniform float fogNoiseImpact;
  varying float vFogDepth;
  varying vec3 vFogWorldPosition;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif

  float fogHash( vec3 p ) {
    p = fract( p * 0.3183099 + vec3( 0.1, 0.2, 0.3 ) );
    p *= 17.0;
    return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) );
  }
  float fogNoise3( vec3 p ) {
    vec3 i = floor( p );
    vec3 f = fract( p );
    f = f * f * ( 3.0 - 2.0 * f );
    return mix(
      mix(
        mix( fogHash( i ),                          fogHash( i + vec3( 1, 0, 0 ) ), f.x ),
        mix( fogHash( i + vec3( 0, 1, 0 ) ),        fogHash( i + vec3( 1, 1, 0 ) ), f.x ),
        f.y ),
      mix(
        mix( fogHash( i + vec3( 0, 0, 1 ) ),        fogHash( i + vec3( 1, 0, 1 ) ), f.x ),
        mix( fogHash( i + vec3( 0, 1, 1 ) ),        fogHash( i + vec3( 1, 1, 1 ) ), f.x ),
        f.y ),
      f.z );
  }
  float fogNoise( vec3 p ) {
    return 0.65 * fogNoise3( p ) + 0.35 * fogNoise3( p * 2.7 );
  }
#endif
`

const FOG_FRAGMENT = /* glsl */ `
#ifdef USE_FOG
  vec3 fogSamplePos = vFogWorldPosition * fogNoiseFreq
    + vec3( fogTime * fogNoiseSpeed, 0.0, fogTime * fogNoiseSpeed * 0.6 );
  float fogN = fogNoise( fogSamplePos );

  // Fog pools at the ground and thins with altitude
  float fogHeight = 0.25 + 0.75 * exp( - max( vFogWorldPosition.y, 0.0 ) * 0.05 );

  #ifdef FOG_EXP2
    float fogDens = fogDensity * fogHeight * ( 1.0 - fogNoiseImpact * fogN );
    float fogFactor = 1.0 - exp( - fogDens * fogDens * vFogDepth * vFogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
    fogFactor *= fogHeight * ( 1.0 - fogNoiseImpact * fogN );
  #endif
  fogFactor = clamp( fogFactor, 0.0, 1.0 );

  gl_FragColor.rgb = mix( gl_FragColor.rgb, mix( fogNearColor, fogColor, fogFactor ), fogFactor );
#endif
`

export function applyVolumetricFog(material) {
  if (!material || material.fog !== true || material.userData.volumetricFog) return
  material.userData.volumetricFog = true

  material.onBeforeCompile = (shader) => {
    shader.uniforms.fogTime        = fogUniforms.fogTime
    shader.uniforms.fogNearColor   = fogUniforms.fogNearColor
    shader.uniforms.fogNoiseFreq   = fogUniforms.fogNoiseFreq
    shader.uniforms.fogNoiseSpeed  = fogUniforms.fogNoiseSpeed
    shader.uniforms.fogNoiseImpact = fogUniforms.fogNoiseImpact

    shader.vertexShader = shader.vertexShader
      .replace('#include <fog_pars_vertex>', FOG_PARS_VERTEX)
      .replace('#include <fog_vertex>', FOG_VERTEX)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <fog_pars_fragment>', FOG_PARS_FRAGMENT)
      .replace('#include <fog_fragment>', FOG_FRAGMENT)
  }
  // Patched and unpatched materials must not share cached programs
  material.customProgramCacheKey = () => 'volumetric-fog'
  material.needsUpdate = true
}
