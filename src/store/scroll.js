// Module-level mutable ref — shared between CameraRig, Track, Signal, Ambience.
// Plain object mutation: zero React re-renders, reads in useFrame are free.
// `progress` is the raw scroll fraction; `smooth` is the damped value written
// by CameraRig each frame — everything scene-side should read `smooth`.
export const scrollState = { progress: 0, smooth: 0 }
