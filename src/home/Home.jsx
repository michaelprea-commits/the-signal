import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import Lenis from 'lenis'
import { panels, intro } from './homeData'
import './home.css'

// Curved video wall. Panels sit on an arc; scroll rotates the wall and dollies
// it up out of the hero, swapping the Bueno overlay. CSS-3D + real <video>, so
// it loads instantly and stays crisp. Mobile/reduced-motion drop to a stack.
const N = panels.length
const STEP = 24 // degrees between panels
const angleOf = (i) => (i - (N - 1) / 2) * STEP

export default function Home() {
  const root = useRef(null)
  const wall = useRef(null)
  const panelRefs = useRef([])
  const hero = useRef(null)
  const cue = useRef(null)
  const active = useRef(null)
  const activeName = useRef(null)
  const activeCls = useRef(null)
  const idxRef = useRef(-1)

  const go = (href) => { if (href) window.location.href = href }

  useLayoutEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const mobile = matchMedia('(max-width: 820px)').matches

    panelRefs.current.forEach((p, i) => { if (p) p.style.setProperty('--a', angleOf(i) + 'deg') })

    if (reduce || mobile) {
      panelRefs.current.forEach((p) => { if (p) { p.style.opacity = '1'; p.classList.add('is-active'); p.style.pointerEvents = 'auto' } })
      if (hero.current) hero.current.style.opacity = '1'
      return
    }

    const lenis = new Lenis({ lerp: 0.09 })
    const rafLenis = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(rafLenis)
    gsap.ticker.lagSmoothing(0)

    // always open on the hero, never a restored scroll position
    try { history.scrollRestoration = 'manual' } catch (e) {}
    window.scrollTo(0, 0)
    lenis.scrollTo(0, { immediate: true })

    const heroY = window.innerHeight * 0.12
    const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

    const frame = () => {
      const t = lenis.limit ? lenis.scroll / lenis.limit : 0
      const rot = (N - 1) * STEP * (0.5 - t)
      const wallY = heroY * (1 - ss(0, 0.12, t))
      const w = wall.current
      if (w) { w.style.setProperty('--rot', rot.toFixed(2) + 'deg'); w.style.setProperty('--wallY', wallY.toFixed(1) + 'px') }

      let bestI = 0, best = 1e9
      panelRefs.current.forEach((p, i) => {
        if (!p) return
        const eff = angleOf(i) + rot
        const a = Math.abs(eff)
        p.style.opacity = (a < 78 ? 1 - (a / 78) * 0.82 : 0.16).toFixed(3)
        p.style.filter = `brightness(${(0.45 + 0.55 * Math.max(0, Math.cos((eff * Math.PI) / 180))).toFixed(3)})`
        const isA = a < STEP / 2
        p.style.pointerEvents = isA ? 'auto' : 'none'
        p.classList.toggle('is-active', isA)
        if (a < best) { best = a; bestI = i }
      })

      if (bestI !== idxRef.current) {
        idxRef.current = bestI
        const d = panels[bestI]
        if (activeName.current) activeName.current.textContent = d.title
        if (activeCls.current) activeCls.current.textContent = d.cls
        if (active.current) active.current.setAttribute('href', d.href)
      }

      const heroOp = 1 - ss(0.02, 0.12, t)
      if (hero.current) { hero.current.style.opacity = heroOp.toFixed(3); hero.current.style.transform = `translateY(${(-30 * (1 - heroOp)).toFixed(1)}px)` }
      if (cue.current) cue.current.style.opacity = heroOp.toFixed(3)
      const actOp = ss(0.08, 0.16, t)
      if (active.current) { active.current.style.opacity = actOp.toFixed(3); active.current.style.transform = `translateY(${(30 * (1 - actOp)).toFixed(1)}px)` }
    }

    gsap.ticker.add(frame)
    frame()

    return () => { gsap.ticker.remove(rafLenis); gsap.ticker.remove(frame); lenis.destroy() }
  }, [])

  return (
    <div className="home" ref={root}>
      <div className="home-stage">
        <div className="home-wall" ref={wall}>
          {panels.map((p, i) => (
            <div className="home-panel" key={p.title} ref={(n) => (panelRefs.current[i] = n)} onClick={() => go(p.href)}>
              {p.video
                ? <video src={p.video} poster={p.img} autoPlay muted loop playsInline />
                : <img src={p.img} alt={p.title} loading="lazy" />}
              <span className="home-panel__name">{p.title} — {p.cls}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="home-ui">
        <a className="home-cs" href="/hold"><span>View</span><span>case</span><span>studies</span></a>

        <div className="home-hero" ref={hero}>
          <h1>{intro.name.join(' ')}</h1>
          <div className="home-hero__roles">{intro.roles.map((r) => <span key={r}>{r}</span>)}</div>
        </div>

        <a className="home-active" ref={active} href={panels[0].href} style={{ pointerEvents: 'auto', textDecoration: 'none' }}>
          <span className="home-active__name" ref={activeName}>{panels[0].title}</span>
          <span className="home-active__cls" ref={activeCls}>{panels[0].cls}</span>
        </a>

        <a className="home-touch" href="mailto:michaelprea@gmail.com">Get in touch ↗</a>
        <div className="home-cue" ref={cue}>↓</div>
      </div>

      <div className="home-driver" />
    </div>
  )
}
