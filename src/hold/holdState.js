import * as THREE from 'three'

// The Hold — scaffold for the case-study archive concept.
//
// Mirrors The Signal's `scrollState` discipline: a module-level mutable
// object, read every frame inside useFrame, written by the rig. Zero React
// re-renders for anything that changes per-frame.
//
//   progress / smooth — facility scroll fraction (0..1); the camera-path param.
//                       `smooth` is the damped value the scene should read.
//   releaseProgress   — 0 = browsing the facility, 1 = fully pushed into the
//                       selected crate. Animated by GSAP during a "release".
//   releaseTarget     — world-space centre of the crate being opened.
export const holdState = {
  progress: 0,
  smooth: 0,
  releaseProgress: 0,
  releaseTarget: new THREE.Vector3(0, 0.9, 0),
}
