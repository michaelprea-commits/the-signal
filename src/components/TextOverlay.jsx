import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// ─── Narrative cards ─────────────────────────────────────────────────────────
// enterPct / leavePct are fractions of total scroll (0–1) over 900vh.
// Visibility is a pure function of scroll progress, applied by a single
// deterministic state machine — no per-card enter/leave callbacks to fall
// out of sync when the scroll jumps or the page refreshes mid-journey.
//
// Each beat is three voices, individually timed:
//   kicker   → fades up as its tracking settles
//   dominant → clip-path sweep + a reduced rise through the mask
//   quiet    → condenses out of the fog (blur → sharp), arrives last
const CARDS = [
  {
    id:       'c0',
    kicker:   'Day one',
    dominant: 'Two days ago,',
    quiet:    'the light began.',
    cls:      'text-card--one',
    enterPct: 0.10,
    leavePct: 0.26,
  },
  {
    id:       'c1',
    kicker:   'Day two',
    dominant: 'Yesterday,',
    quiet:    'the tracks were found.',
    cls:      'text-card--two',
    enterPct: 0.50,
    leavePct: 0.64,
  },
  {
    id:       'c2',
    kicker:   'Day three',
    dominant: 'The line had been closed',
    quiet:    'for centuries.',
    cls:      'text-card--final',
    enterPct: 0.90,
    leavePct: 1.1,    // never leaves going forward
    final:    true,
  },
]

const TITLE_LEAVE = 0.025

const CLIP_FULL   = 'inset(0% 0% 0% 0%)'
const CLIP_BOTTOM = 'inset(0% 0% 100% 0%)' // hidden below — entrances
const CLIP_TOP    = 'inset(100% 0% 0% 0%)' // hidden above — forward exits

function voices(el) {
  return {
    kicker: el.querySelector('.text-card__kicker'),
    mask:   el.querySelector('.line'),
    inner:  el.querySelector('.line__inner'),
    quiet:  el.querySelector('.text-card__quiet'),
  }
}

function showCard(el, card) {
  const v = voices(el)
  gsap.set(el, { opacity: 1 })

  // Metadata — tracking settles as it surfaces
  gsap.fromTo(v.kicker,
    { opacity: 0, letterSpacing: '0.65em' },
    { opacity: 1, letterSpacing: '0.55em', duration: 2.4, ease: 'power2.out', overwrite: true })

  // Dominant — the clip sweeps open while the line rises a short distance
  // inside it, condensing from a faint blur: discovered, not delivered.
  gsap.fromTo(v.mask,
    { clipPath: CLIP_BOTTOM },
    { clipPath: CLIP_FULL, duration: card.final ? 2.0 : 1.6, delay: 0.2, ease: 'power4.out', overwrite: true })
  gsap.fromTo(v.inner,
    { yPercent: 40, filter: 'blur(3px)' },
    { yPercent: 0, filter: 'blur(0px)', duration: card.final ? 2.2 : 1.8, delay: 0.2, ease: 'expo.out', overwrite: true })

  // Quiet — condenses out of the fog, on its own delay. The held beat
  // before the final "for centuries." is the typographic silence.
  gsap.fromTo(v.quiet,
    { opacity: 0, filter: 'blur(8px)' },
    {
      opacity: 1,
      filter: 'blur(0px)',
      duration: card.final ? 2.8 : 2.0,
      delay: card.final ? 1.1 : 0.7,
      ease: 'power2.out',
      overwrite: true,
    })

  if (card.final) {
    // The last dominant settles like a title card: tracking eases home
    gsap.fromTo(v.inner,
      { letterSpacing: '0.2em' },
      { letterSpacing: '0.14em', duration: 3.2, ease: 'power2.out', overwrite: 'auto' })
  }
}

function hideCard(el, forward) {
  const v = voices(el)
  gsap.to(v.mask, {
    clipPath: forward ? CLIP_TOP : CLIP_BOTTOM,
    duration: 0.8, ease: 'power2.in', overwrite: true,
  })
  gsap.to(v.inner, { yPercent: forward ? -30 : 30, duration: 0.8, ease: 'power2.in', overwrite: true })
  gsap.to(v.quiet,  { opacity: 0, filter: 'blur(6px)', duration: 0.7, ease: 'power2.in', overwrite: true })
  gsap.to(v.kicker, { opacity: 0, duration: 0.6, ease: 'power2.in', overwrite: true })
}

export function TextOverlay() {
  const refs     = useRef([])
  const titleRef = useRef(null)

  useEffect(() => {
    const maxScroll = () => ScrollTrigger.maxScroll(window)
    const triggers = []
    const tweens = []
    let cancelled = false

    // null = untouched (initial CSS state), true/false = last applied state
    const state = { title: null, cards: CARDS.map(() => null) }

    const apply = (p) => {
      // Title — present only at the threshold of the experience
      const tVisible = p < TITLE_LEAVE
      if (tVisible !== state.title && titleRef.current) {
        const firstShow = state.title === null
        gsap.to(titleRef.current, tVisible
          ? { opacity: 1, duration: firstShow ? 2.8 : 2.4, delay: firstShow ? 0.6 : 0, ease: 'power2.out', overwrite: true }
          : { opacity: 0, duration: 1.0, ease: 'power2.in', overwrite: true })
        state.title = tVisible
      }

      CARDS.forEach((card, i) => {
        const el = refs.current[i]
        if (!el) return
        const visible = p >= card.enterPct && p <= card.leavePct
        if (visible !== state.cards[i]) {
          if (visible) {
            showCard(el, card)
          } else if (state.cards[i] === true) {
            hideCard(el, p > card.leavePct)
          }
          state.cards[i] = visible
        }
      })
    }

    const setup = () => {
      // One driver for all narrative state — progress in, visibility out
      triggers.push(ScrollTrigger.create({
        start: 0,
        end: () => maxScroll(),
        onUpdate: self => apply(self.progress),
      }))

      // Depth — two parallax rates inside each card: the dominant line
      // sits deeper, the small type nearer. Barely perceptible.
      // The final card stands perfectly still.
      CARDS.forEach((card, i) => {
        if (card.final) return
        const el = refs.current[i]
        if (!el) return
        const v = voices(el)
        const layers = [
          [v.mask, 22],
          [v.kicker, 10],
          [v.quiet, 10],
        ]
        layers.forEach(([node, amp]) => {
          if (!node) return
          tweens.push(gsap.fromTo(node,
            { y: amp },
            {
              y: -amp,
              ease: 'none',
              scrollTrigger: {
                start: () => maxScroll() * card.enterPct - window.innerHeight * 0.4,
                end:   () => maxScroll() * card.leavePct + window.innerHeight * 0.4,
                scrub: true,
              },
            }))
        })
      })

      // Scroll hint
      const hint = document.querySelector('.scroll-hint')
      if (hint) {
        gsap.to(hint, { opacity: 1, duration: 2.5, delay: 2.4, ease: 'power2.out' })
        triggers.push(ScrollTrigger.create({
          start: 40,
          end:   41,
          once:  true,
          onEnter: () => gsap.to(hint, { opacity: 0, duration: 0.6, overwrite: true }),
        }))
      }

      ScrollTrigger.refresh()
      apply(maxScroll() > 0 ? window.scrollY / maxScroll() : 0)
    }

    // Don't build triggers until the scroll driver has real height —
    // a degenerate maxScroll at mount would misplace every range.
    const tryInit = () => {
      if (cancelled) return
      if (maxScroll() > window.innerHeight * 2) setup()
      else setTimeout(tryInit, 100)
    }
    tryInit()

    return () => {
      cancelled = true
      triggers.forEach(t => t.kill())
      tweens.forEach(t => { t.scrollTrigger?.kill(); t.kill() })
    }
  }, [])

  return (
    <>
      <div className="text-layer">
        {/* Title — the only framing the piece gets */}
        <div ref={titleRef} className="site-title">
          <span className="site-title__kicker">A field record</span>
          <h1>The Signal</h1>
          <span className="site-title__rule" />
        </div>

        {CARDS.map((card, i) => (
          <div
            key={card.id}
            ref={el => { refs.current[i] = el }}
            className={`text-card ${card.cls}`}
          >
            <span className="text-card__kicker">{card.kicker}</span>
            <h2 className="text-card__dominant">
              <span className="line">
                <span className="line__inner">{card.dominant}</span>
              </span>
            </h2>
            <span className="text-card__quiet">{card.quiet}</span>
          </div>
        ))}
      </div>

      <div className="scroll-hint">
        <span className="scroll-hint__line" aria-hidden="true" />
        <span>scroll</span>
      </div>
    </>
  )
}
