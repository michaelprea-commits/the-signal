import { Canvas } from '@react-three/fiber'
import { PCFShadowMap } from 'three'
import Scene from './Scene'
import { TextOverlay } from './components/TextOverlay'
import { Ambience } from './components/Ambience'
import './App.css'

// Camera starts at the beginning of the path (matches CameraRig PATH[0]).
// Narrow-ish fov for cinematic compression — the horizon feels closer, flatter.
const CAMERA_START = { position: [1.6, 1.55, 72], fov: 38, near: 0.1, far: 1000 }

export default function App() {
  return (
    <>
      {/* ── Fixed 3D canvas ─────────────────────────────────────────────── */}
      <div className="canvas-wrapper">
        <Canvas
          shadows={{ type: PCFShadowMap }}
          camera={CAMERA_START}
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 1.5]}
        >
          <Scene />
        </Canvas>
      </div>

      {/* ── Title, text cards, scroll hint ──────────────────────────────── */}
      <TextOverlay />

      {/* ── Procedural ambience (wind + signal hum), off by default ────── */}
      <Ambience />

      {/* ── Scroll driver ────────────────────────────────────────────────── */}
      {/* Height creates the scrollable document — no visual content here */}
      <div className="scroll-driver" aria-hidden="true" />

      {/* ── Intro veil ───────────────────────────────────────────────────── */}
      {/* Held black on arrival — covers asset pop-in, gives the title its
          dark. Pure CSS; fades itself out and stops painting. */}
      <div className="intro-veil" aria-hidden="true" />
    </>
  )
}
