import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Routes, code-split per entry. / and /signal and /hold all pull in
// three.js/@react-three/fiber; /work/* (the case studies, plain DOM+CSS)
// does not, so it's lazy-loaded separately to keep that bundle three.js-free.
const App = lazy(() => import('./App.jsx'))
const HoldApp = lazy(() => import('./hold/HoldApp.jsx'))
const CaseStudy = lazy(() => import('./case/CaseStudy.jsx'))
const HomeApp = lazy(() => import('./home/HomeApp.jsx'))

// / = homepage (the hoop); /work/* = a case study; /signal = The Signal
// (kept, not the front). The Hold is no longer linked from the homepage —
// left routable at /hold for now but off the critical path.
const path = window.location.pathname
let Root
if (/\/work\//.test(path)) Root = CaseStudy
else if (/hold/i.test(path)) Root = HoldApp
else if (/signal/i.test(path)) Root = App
else Root = HomeApp

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={null}>
      <Root />
    </Suspense>
  </StrictMode>,
)
