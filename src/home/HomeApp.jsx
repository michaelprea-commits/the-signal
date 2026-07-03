import { Suspense, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { PCFSoftShadowMap } from 'three'
import { useProgress } from '@react-three/drei'
import { gsap } from 'gsap'
import { HomeScene } from './HomeScene'
import { homeState } from './homeState'
import { panels, intro } from './homeData'
import './home.css'

// Homepage: a fixed R3F canvas (the hoop) under a Bueno/mono overlay. Native
// scroll → homeState.progress (the scene damps it); a rAF drives overlay opacity,
// and each project's copy reveals with a hand-rolled GSAP split-text rise as it
// reaches the front — kinetic, not a fade.
const N = panels.length

// split helpers — wrap each char/word in an inline-block span GSAP can stagger
function splitChars(el, text) {
  el.textContent = ''
  const out = []
  for (const c of text) {
    const s = document.createElement('span')
    s.className = 'ch'
    s.textContent = c === ' ' ? ' ' : c
    el.appendChild(s)
    out.push(s)
  }
  return out
}
function splitWords(el, text) {
  el.textContent = ''
  return text.split(' ').map((w) => {
    const s = document.createElement('span')
    s.className = 'wd'
    s.textContent = w
    el.appendChild(s)
    return s
  })
}

export default function HomeApp() {
  const hero = useRef(null)
  const cue = useRef(null)
  const active = useRef(null)
  const aIdx = useRef(null)
  const aName = useRef(null)
  const aCls = useRef(null)
  const aBlurb = useRef(null)
  const aMore = useRef(null)
  const idx = useRef(-1)
  const root = useRef(null)
  const loader = useRef(null)
  const lNum = useRef(null)
  const lBar = useRef(null)
  const texP = useRef(0)

  // real texture progress from drei's loading manager (works outside Canvas)
  const dreiProgress = useProgress((s) => s.progress)
  useEffect(() => { texP.current = dreiProgress }, [dreiProgress])

  useEffect(() => {
    try { history.scrollRestoration = 'manual' } catch (e) {}
    window.scrollTo(0, 0)

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      homeState.progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    // per-project copy reveal — split-text rise as each project reaches the front
    const reduceM = matchMedia('(prefers-reduced-motion: reduce)').matches
    let tl
    const reveal = (i) => {
      if (tl) tl.kill()
      if (aIdx.current) aIdx.current.textContent = String(i + 1).padStart(2, '0') + ' — ' + String(N).padStart(2, '0')
      if (aCls.current) aCls.current.textContent = panels[i].tag
      if (aMore.current) aMore.current.textContent = panels[i].more + ' →'
      if (active.current) active.current.setAttribute('href', panels[i].href)
      if (reduceM) { // no choreography — swap content directly
        if (aName.current) aName.current.textContent = panels[i].title
        if (aBlurb.current) aBlurb.current.textContent = panels[i].blurb
        return
      }
      const chars = aName.current ? splitChars(aName.current, panels[i].title) : []
      const words = aBlurb.current ? splitWords(aBlurb.current, panels[i].blurb) : []
      tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      if (aIdx.current) tl.from(aIdx.current, { yPercent: 120, opacity: 0, duration: 0.55 }, 0)
      if (chars.length) tl.from(chars, { yPercent: 100, opacity: 0, duration: 0.9, stagger: 0.022 }, 0.05)
      if (aCls.current) tl.from(aCls.current, { yPercent: 100, opacity: 0, duration: 0.5 }, 0.26)
      if (words.length) tl.from(words, { yPercent: 110, opacity: 0, duration: 0.7, stagger: 0.012 }, 0.32)
      if (aMore.current) tl.from(aMore.current, { opacity: 0, y: 10, duration: 0.5 }, 0.5)
    }

    // ── loader — real progress (fonts / page / textures), damped counter,
    //    choreographed hand-off into the scene entrance ──
    let pFonts = 0, pLoad = 0, shown = 0, exiting = false
    document.fonts.ready.then(() => { pFonts = 1 })
    if (document.readyState === 'complete') pLoad = 1
    else window.addEventListener('load', () => { pLoad = 1 }, { once: true })
    const lStart = performance.now()
    const goLive = () => {
      homeState.ready = true
      if (root.current) root.current.classList.add('is-live')
    }
    const exitLoader = () => {
      exiting = true
      if (lNum.current) lNum.current.textContent = '100'
      if (lBar.current) lBar.current.style.transform = 'scaleX(1)'
      const etl = gsap.timeline()
      etl.to(lNum.current, { yPercent: 110, duration: 0.55, ease: 'expo.in' }, 0.12)
      etl.to('.home-loader__head, .home-loader__foot, .home-loader__bar', { opacity: 0, duration: 0.35 }, 0.2)
      etl.add(goLive, 0.62)
      etl.to(loader.current, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.9, ease: 'expo.inOut' }, 0.66)
      etl.set(loader.current, { display: 'none' })
    }
    if (homeState.ready || reduceM) { // revisit (dev remount) or reduced motion: no ceremony
      if (loader.current) loader.current.style.display = 'none'
      goLive()
    }

    const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
    let t0 = 0
    let raf
    const loop = () => {
      // loader phase — tick the counter toward real progress, then hand off
      if (!homeState.ready) {
        const target = pFonts * 0.3 + pLoad * 0.3 + (texP.current / 100) * 0.4
        shown += (target - shown) * 0.075
        const stuck = performance.now() - lStart > 8000 // failsafe: never trap the visitor
        if (!exiting && lNum.current) {
          lNum.current.textContent = String(Math.min(99, Math.round(shown * 100))).padStart(3, '0')
          if (lBar.current) lBar.current.style.transform = `scaleX(${shown.toFixed(4)})`
          if ((shown > 0.992 && performance.now() - lStart > 1600) || stuck) exitLoader()
        }
        raf = requestAnimationFrame(loop)
        return
      }
      if (!t0) t0 = performance.now()
      const t = homeState.smooth
      const ie = 1 - Math.pow(1 - Math.min(1, (performance.now() - t0) / 1100), 3) // entrance ease-out
      const heroOp = 1 - ss(0.02, 0.12, t)
      if (hero.current) {
        hero.current.style.opacity = (heroOp * ie).toFixed(3)
        hero.current.style.transform = `translateY(${(-30 * (1 - heroOp)).toFixed(1)}px)`
        hero.current.style.filter = heroOp > 0.98 ? 'none' : `blur(${(7 * (1 - heroOp)).toFixed(2)}px)` // defocus on exit
      }
      if (cue.current) cue.current.style.opacity = (heroOp * ie).toFixed(3)
      if (active.current) active.current.style.opacity = ie.toFixed(3)
      const i = homeState.active
      if (i !== idx.current && panels[i]) {
        idx.current = i
        reveal(i)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
      if (tl) tl.kill()
    }
  }, [])

  return (
    <div className="home" ref={root}>
      <div className="home-loader" ref={loader}>
        <div className="home-loader__head">
          <span>Michael Rea</span>
          <span>Portfolio · 2026</span>
        </div>
        <div className="home-loader__count"><span ref={lNum}>000</span></div>
        <div className="home-loader__bar"><i ref={lBar} /></div>
        <div className="home-loader__foot">
          <span>Loading selected work</span>
          <span>Xbox · Tencent · Marvel · Warhammer · AMD</span>
        </div>
      </div>

      <div className="atmos"><div className="atmos__glow" /></div>
      <div className="home-canvas">
        <Canvas shadows={{ type: PCFSoftShadowMap }} dpr={[1, 1.8]} gl={{ antialias: true, alpha: true }}
          camera={{ position: [0, 3.5, 29], fov: 35, near: 0.1, far: 100 }}>
          <Suspense fallback={null}><HomeScene /></Suspense>
        </Canvas>
      </div>

      <div className="home-blur home-blur--top" />
      <div className="home-blur home-blur--bot" />

      <div className="home-ui">
        <div className="home-status"><i />Open to select roles & projects</div>

        <div className="home-hero" ref={hero}>
          <div className="home-hero__line"><h1>{intro.name.join(' ')}</h1></div>
          <div className="home-hero__roles">{intro.roles.map((r) => <span key={r}>{r}</span>)}</div>
        </div>

        <a className="home-active" ref={active} href={panels[0].href} style={{ pointerEvents: 'auto', textDecoration: 'none' }}>
          <span className="home-active__index" ref={aIdx}>01 — {String(N).padStart(2, '0')}</span>
          <span className="home-active__name" ref={aName}>{panels[0].title}</span>
          <span className="home-active__cls" ref={aCls}>{panels[0].tag}</span>
          <p className="home-active__blurb" ref={aBlurb}>{panels[0].blurb}</p>
          <span className="home-active__more" ref={aMore}>{panels[0].more} →</span>
        </a>

        <a className="home-touch" href="mailto:michaelprea@gmail.com">Get in touch ↗</a>
        <div className="home-cue" ref={cue}><span>Scroll</span><i /></div>
      </div>

      <div className="home-driver" />
    </div>
  )
}
