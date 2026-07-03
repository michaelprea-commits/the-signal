import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { gsap } from 'gsap'
import HoldScene from './HoldScene'
import { HoldHUD } from './HoldHUD'
import { Dossier } from './Dossier'
import { holdState } from './holdState'
import './hold.css'

// Matches HoldCameraRig PATH[0] so there's no first-frame jump.
const CAMERA_START = { position: [0, 1.3, 4.7], fov: 42, near: 0.1, far: 400 }

// phase: facility → releasing → dossier → (returning) → facility
export default function HoldApp() {
  const [phase, setPhase] = useState('facility')
  const bloom = useRef(null)
  const tl    = useRef(null)

  // ── Release: fly into the crate, bloom the glow, land in the dossier ──
  const startRelease = useCallback((targetVec) => {
    setPhase((p) => {
      if (p !== 'facility') return p
      holdState.releaseTarget.copy(targetVec)

      tl.current?.kill()
      tl.current = gsap.timeline()
      // camera dives into the lid gap
      tl.current.to(holdState, { releaseProgress: 1, duration: 1.7, ease: 'power2.inOut' }, 0)
      // the glow swells to a whiteout, masking the WebGL → DOM cut
      if (bloom.current) {
        tl.current.fromTo(bloom.current,
          { opacity: 0, scale: 0.4 },
          { opacity: 1, scale: 1.4, duration: 1.0, ease: 'power2.in' }, 0.7)
      }
      // the document arrives through the bloom...
      tl.current.add(() => setPhase('dossier'), 1.5)
      // ...then the bloom clears off it
      if (bloom.current) {
        tl.current.to(bloom.current, { opacity: 0, duration: 0.9, ease: 'power2.out' }, 1.95)
      }
      return 'releasing'
    })
  }, [])

  // ── Close: reverse the dive. Scroll position never changed, so the camera
  //    returns to exactly where it left off in the facility (spatial memory). ──
  const closeDossier = useCallback(() => {
    setPhase('returning')
    gsap.to(holdState, {
      releaseProgress: 0, duration: 1.3, ease: 'power2.inOut',
      onComplete: () => setPhase('facility'),
    })
  }, [])

  // Lock window scroll while reading — the mode-switch from camera-scroll to
  // document-scroll. The dossier owns scroll while open; the facility owns it
  // otherwise.
  useEffect(() => {
    document.body.style.overflow = phase === 'dossier' ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [phase])

  return (
    <>
      <div className="canvas-wrapper">
        <Canvas camera={CAMERA_START} gl={{ antialias: true, alpha: false }} dpr={[1, 1.5]}>
          <color attach="background" args={['#04070a']} />
          <HoldScene onRelease={startRelease} />
        </Canvas>
      </div>

      <HoldHUD phase={phase} onClose={closeDossier} />
      <Dossier open={phase === 'dossier'} onClose={closeDossier} onNext={closeDossier} />

      <div ref={bloom} className="hold-bloom" aria-hidden="true" />
      <div className="hold-scroll-driver" aria-hidden="true" />
      <div className="hold-veil" aria-hidden="true" />
    </>
  )
}
