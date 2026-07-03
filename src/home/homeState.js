// Shared scroll/active state for the homepage wall (module-mutable, read in
// useFrame — zero React re-renders). `ready` flips when the loader hands off;
// the scene entrance and hero reveal wait for it.
export const homeState = { progress: 0, smooth: 0, active: 0, ready: false }
