import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import HoldApp from './hold/HoldApp.jsx'
import CaseStudy from './case/CaseStudy.jsx'
import HomeApp from './home/HomeApp.jsx'

// Routes, one bundle. / = homepage (the hoop); /work/* = a case study;
// /signal = The Signal (kept, not the front). The Hold is no longer linked from
// the homepage — left routable at /hold for now but off the critical path.
const path = window.location.pathname
let root
if (/\/work\//.test(path)) root = <CaseStudy />
else if (/hold/i.test(path)) root = <HoldApp />
else if (/signal/i.test(path)) root = <App />
else root = <HomeApp />

createRoot(document.getElementById('root')).render(
  <StrictMode>{root}</StrictMode>,
)
