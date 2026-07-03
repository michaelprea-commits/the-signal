import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { CASES } from './cases'
import { Block } from './blocks'
import './case.css'

// Case study route (/hold/specimen/<slug>) — no WebGL. Lenis smooth scroll +
// GSAP. Fail-open: from-states set in useLayoutEffect (no flash); in-view plays
// on load, below-fold on enter; a catch clears everything if anything throws.
export default function CaseStudy() {
  const root = useRef(null)
  const slug = window.location.pathname.split('/').filter(Boolean).pop()
  const data = CASES[slug] || CASES['turn-10']

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    gsap.registerPlugin(ScrollTrigger)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

    let lenis, raf
    const ctx = gsap.context(() => {
      gsap.to('.case-progress', {
        scaleX: 1, ease: 'none',
        scrollTrigger: { start: 0, end: () => ScrollTrigger.maxScroll(window), scrub: 0.3 },
      })
      if (reduce) return

      try {
        const q = (sel) => gsap.utils.toArray(sel, el)
        // the environment answers the scroll — glow drifts + swells slowly under the content.
        // scrub is 1:1 (not a lagged value) — Lenis already supplies the smoothing, and a
        // second independent lag on top of it caused a visible snap as scroll settled.
        const glow = document.querySelector('.atmos__glow')
        if (glow) gsap.to(glow, { yPercent: -6, scale: 1.14, ease: 'none', scrollTrigger: { start: 0, end: () => ScrollTrigger.maxScroll(window), scrub: true } })
        const onScreen = (n) => n.getBoundingClientRect().top < window.innerHeight * 0.9
        // in view at load → animate now; below the fold → animate on enter
        const reveal = (target, trigger, vars, start = 'top 88%') =>
          onScreen(trigger)
            ? gsap.from(target, vars)
            : gsap.from(target, { ...vars, scrollTrigger: { trigger, start, once: true } })

        // ── entrances ──────────────────────────────────────────────────────
        // display headlines: masked lines rise, de-blur, de-skew, then unclip
        q('[data-reveal="display"]').forEach((t) => {
          reveal(t.querySelectorAll('.d-line__i'), t, {
            yPercent: 120, skewY: 5, autoAlpha: 0, filter: 'blur(10px)',
            duration: 1.3, ease: 'expo.out', stagger: 0.09,
            onComplete() { t.querySelectorAll('.d-line').forEach((d) => { d.style.overflow = 'visible' }) },
          }, 'top 90%')
        })
        // prose blocks
        q('[data-reveal="lines"]').forEach((t) => reveal(t, t, { y: 46, autoAlpha: 0, filter: 'blur(8px)', duration: 1.15, ease: 'expo.out' }, 'top 92%'))
        // marks / labels
        q('[data-reveal="fade"]').forEach((t) => reveal(t, t, { y: 52, autoAlpha: 0, duration: 1.1, ease: 'expo.out' }, 'top 94%'))

        // tables (facts / credits): staggered rise + wide→standard tracking
        q('[data-reveal="settle"]').forEach((t) => {
          const rows = t.querySelectorAll('.facts__item').length ? t.querySelectorAll('.facts__item') : t.querySelectorAll('dt, dd')
          reveal(rows, t, { y: 44, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07 }, 'top 88%')
          const labels = t.querySelectorAll('.facts__k, dt')
          if (labels.length) reveal(labels, t, { letterSpacing: '0.6em', autoAlpha: 0, duration: 1.5, ease: 'expo.out', stagger: 0.07 }, 'top 88%')
        })

        // gallery cluster: staggered rise + scale-in
        q('.gallery').forEach((g) => reveal(g.querySelectorAll('.gallery__item'), g, { y: 90, autoAlpha: 0, scale: 0.92, duration: 1.3, ease: 'expo.out', stagger: 0.12 }, 'top 85%'))
        // index rows
        q('.case-index__list').forEach((l) => reveal(l.querySelectorAll('.case-index__row'), l, { y: 36, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, 'top 88%'))

        // ── media (images + reel video): clip-path wipe + scale settle, then parallax ──
        q('[data-parallax]').forEach((frame) => {
          const img = frame.querySelector('img, video')
          reveal(frame, frame, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.4, ease: 'expo.out' }, 'top 86%')
          if (img) {
            reveal(img, frame, { scale: 1.35, duration: 1.7, ease: 'expo.out' }, 'top 86%')
            gsap.fromTo(img, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true } })
          }
        })
        // each gallery image drifts within its frame at a different rate, so
        // they slide past one another as you scroll
        const gSpeeds = [6, 3, 4.5]
        q('.gallery__item').forEach((item, i) => {
          const img = item.querySelector('img')
          if (!img) return
          const s = gSpeeds[i % gSpeeds.length]
          gsap.fromTo(img, { yPercent: -s }, { yPercent: s, ease: 'none', scrollTrigger: { trigger: item, start: 'top bottom', end: 'bottom top', scrub: true } })
        })

        // ── exits: continuous motion as things leave ────────────────────────
        // hero headline: lines spread (leading opens) + drift up — transform
        // only, so the masks never clip (this is what broke before)
        gsap.to(q('.hero-headline .d-line'), {
          yPercent: (i, t, arr) => -10 - (arr.length - 1 - i) * 16, autoAlpha: 0.4, ease: 'none',
          scrollTrigger: { trigger: '.case-hero', start: 'top top', end: 'bottom top', scrub: true },
        })
        // headings + quotes drift and fade as they leave the viewport
        q('.movement__heading, .quote blockquote').forEach((t) => {
          gsap.to(t, { yPercent: -16, autoAlpha: 0.4, ease: 'none', scrollTrigger: { trigger: t, start: 'center 45%', end: 'bottom 8%', scrub: true } })
        })

        // statements: one clean rise on entry (no scrub — scrubbed scale on
        // display-size type caused visible lag/flicker)
        q('.statement h2').forEach((t) => {
          reveal(t.children, t, { y: 70, autoAlpha: 0, duration: 1.3, ease: 'expo.out', stagger: 0.09 }, 'top 86%')
        })
      } catch (err) {
        gsap.set(el.querySelectorAll('[data-reveal], [data-reveal] .d-line__i, [data-parallax], .gallery__item, .case-index__row, .facts__item, .credits dt, .credits dd'), { clearProps: 'all' })
        console.error('[case] reveal setup failed, content revealed', err)
      }
    }, root)

    lenis = new Lenis({ lerp: 0.1 })
    lenis.on('scroll', ScrollTrigger.update)
    raf = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    if (!reduce) {
      const skewSetters = gsap.utils.toArray('[data-skew]', el).map((t) => gsap.quickTo(t, 'skewY', { duration: 0.5, ease: 'power3' }))
      lenis.on('scroll', ({ velocity = 0 }) => {
        const s = gsap.utils.clamp(-3, 3, velocity * 0.05)
        skewSetters.forEach((set) => set(s))
      })
    }

    ScrollTrigger.refresh()

    return () => {
      ctx.revert()
      gsap.ticker.remove(raf)
      lenis.destroy()
    }
  }, [data])

  return (
    <>
      <div className="atmos"><div className="atmos__glow" /></div>
      <div className="case" ref={root} style={{ '--accent': data.accent }}>
        <div className="case-progress" />
        <nav className="case-head">
          <a href="/">← work</a>
          <span>{data.title}</span>
        </nav>
        {data.blocks.map((b, i) => <Block key={i} block={b} />)}
      </div>
    </>
  )
}
