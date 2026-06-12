# DESIGN INTENT — "The Signal"

This document is the creative contract for this project. Every future change
should be tested against it. If a change makes the scene more impressive but
less mysterious, it is wrong.

---

## 1. What this is

A scroll-driven 3D narrative scene: a desert at blue hour, a buried railway,
and one working signal lamp. It should feel **less like a website and more
like a scene from a forgotten story that was never fully explained.**

**This is not a railway story. It is a mystery story.**

The audience should spend most of the journey asking *"What is that light?"*
The answer must create more questions than it resolves. The target emotional
sequence at the end is:

1. "Now I understand what I'm looking at."
2. *Immediately followed by:* "That makes even less sense."

### Never
- Game level design, Three.js tech-demo aesthetics, sci-fi spectacle,
  excessive visual effects, gimmick animations (typewriters, generic
  fades/slides), UI-feeling text.

### Always
- Atmosphere, composition, pacing, restraint, anticipation.
- The animation should feel expensive. The viewer should barely notice it.

---

## 2. Narrative structure (sequential discovery)

The story only works if information arrives in this order:

| Phase | Scroll | What the audience experiences |
|-------|--------|-------------------------------|
| 1 | 0–25% | A mysterious light in the distance. No idea what it is. Title, then *"Two days ago, the light began."* Only the light is visible — never the structure under it. |
| 2 | 25–50% | Moving toward the light. It **disappears behind a sand drift, then reappears** at the crest. Partially buried metal shapes appear in the sand — ambiguous, not yet readable. |
| 3 | 50–75% | The shapes become recognisable as **railway tracks**. *"Yesterday, the tracks were found."* must coincide with the first recognisable glimpse of rail. **The railway is the reveal — not the signal.** |
| 4 | 75–95% | The light is understood to belong to **railway infrastructure** (a signal). The camera aligns with the rails; the final approach feels inevitable. |
| 5 | 95–100% | *"The line had been closed for centuries."* — the caption that destroys the understanding the railway reveal created. Shortly after arrival, the signal turns **green**: clearing the line for a train that is centuries late. |

The signal is not the reveal. The railway is the reveal. The final caption
transforms the reveal back into a mystery.

---

## 3. The Cathedral vs The Signal (critical distinction)

These are **separate story elements with different jobs**:

### The Cathedral (the GLB, `Cathedral.jsx`)
- A colossal ruin — industrial cathedral, forgotten megastructure, sacred
  ruin. **Part of the world, not part of the mystery.** It has always been
  there.
- It is a **monumental landscape feature, not a neighbouring building**:
  it stands well off the railway corridor the way a mountain stands —
  a skyline event that emerges from haze over the whole journey and never
  resolves past a dark ghost with a hint of masonry. At least 5–10× more
  visually important than any horizon building. It remains unexplained.
- It is NOT: a signal box, a railway building, or a story reveal.
- Technical note: the GLB ("SW tower", ~17×30×16 units) authors its mesh
  ~+30.9 on X; `Cathedral.jsx` re-seats it with an offset. Body lands at
  world x ≈ 38, z ≈ −40, scale 2.3 (~69 units tall) — clear of the
  corridor, inside partial-fog range, with a dedicated mist bank (z −15)
  standing before its face. The audience never gets a complete view.

### The Signal (`Signal.jsx`, procedural)
- A **small, human-scale piece of railway furniture**: mast, round backplate,
  hooded colour-light head, lamp at ~4.6 units, with a signal-box hut
  silhouette nearby. Recognisable railway language — but revealed slowly,
  portions always hidden in atmosphere, never a clean technical view.
- **The signal changed. The light appeared recently.** It is the only
  functioning machine left in the world — the brightest object in the scene.
- Lamp behaviour: long red holds (8–32s), rare brief green (1.5–5.5s),
  electrical flicker with occasional gutters. Red is brighter than green
  (danger). At scroll >96.5%, a scripted finale: the signal goes green and
  holds — granting permission to no one.

**The cathedral dominates the landscape. The signal dominates the narrative.**

---

## 4. Composition map

```
        LEFT                    CENTRE                   RIGHT
  The world beyond           The mystery              The Cathedral
  ----------------        ----------------          ----------------
  Distant silhouettes:     LARGELY EMPTY.            The GLB, looming.
  lost settlements,        Only: signal light,       Camera passes its
  abandoned industry,      drifting atmosphere,      face at the end.
  forgotten infra.         partially buried track.   Never fully seen.
  Kilometres away.         The emptiness is the
  Never compete with       point. The light is
  signal or cathedral.     the focal point.
```

- World scale must feel **immense, ancient, abandoned** (≥10× the naive
  scene scale). Achieved with: matte-painting horizon layers (fog-exempt
  `MeshBasicMaterial` pre-faded toward the sky colour — farther = closer to
  sky), stratified haze planes between layers, and the real fog only doing
  near-field work. Far layer sits near the sky-dome radius.
- The track corridor stays flat and empty; dunes rise laterally. One sand
  drift crosses the corridor (~z 38) for the occlusion beat.

---

## 5. Atmosphere (the most important system)

Reference: **Blade Runner 2049 Las Vegas sequence** — not a game environment.
Do not simply increase FogExp2 density. The atmosphere is layered:

1. `fogExp2`, upgraded by `src/fx/fogPatch.js` (the snayss "Three.js fog
   hacks" technique — onBeforeCompile chunk replacement on every fogging
   material): height falloff (fog pools at the ground; tall silhouettes
   rise out of a fog sea), drifting 3D-noise density (patchy, wind-blown
   visibility), and dual colour (warm violet near-fog → deep indigo far).
   One shared `fogTime` uniform animates all materials.
2. **Mist curtains** (`Atmosphere.jsx`) — large noise-animated planes across
   the route that the camera physically passes through. They breathe over
   time; the lamp brightens, dims, and vanishes behind them. The last two
   stand at/behind the signal so it never gets a clean reveal.
3. **Haze strata** — vast, faint horizontal gradient banks between the
   distant matte layers (aerial perspective at kilometre distances).
4. **Ground mist** — low drifting sheets over the corridor.
5. **Dust** — sparse suspended motes near the camera.
6. NO full-frame light passes (GodRays was tried and cut: a radial
   resample of a flickering source flashes the whole frame). Light-in-air
   is carried by the lamp's layered sprites; any lamp flicker must be a
   continuous function — never a frame-to-frame step in a bright source.
7. The lamp's glow sprites are **fog-exempt** so the light pierces haze long
   before its structure resolves — the light often appears suspended in fog.

The atmosphere must hide information: the audience should frequently be
unsure whether a shape is a structure, a mesa, a ruin, or infrastructure.

**The 80% rule:** for roughly 80% of the journey the audience sees only a
distant red light through haze. The signal structure stays buried in the
near-signal mist banks (which dissolve only as the camera physically
reaches them) and is largely unreadable until the final approach. Even the
reveal keeps a thin veil — never a clean technical view.

**Negative space rule:** the corridor carries only what does narrative
work — a handful of half-buried shapes (Phase 2 evidence), five broken
poles, the hut, sparse scrub at the edges. When in doubt, remove the
object. Darkness is a material here.

---

## 6. Lighting

Blue hour, 20–30 minutes after sunset. The sun is gone.

- Deep indigo sky collapsing to near-black; violet shadows; one thin warm
  afterglow band compressed against the western horizon (sky shader).
- Foregrounds dark; minimal direct light (faint zenith skylight is the only
  shadow-caster, plus near-zero ambient and a hemisphere wash).
- **The signal lamp is the brightest object in the scene** and lights its
  own world: it pools on the track below, rims the hut and the cathedral
  flank, and its corridor-reaching fill is HOW the rails are discovered.
- Heavy bloom, generous halation, film grain, deep vignette, slight
  desaturation. Stars are faint and sparse. Dithering kills banding.

---

## 7. Camera

A person walking. Not a crane, not a drone, not a dolly.

- Eye height ~1.4–1.6 (rises to ~4 only when cresting the sand drift).
- Lateral wander ≤ ~3 units total (5–10°), heavy inertia, micro-drift,
  faint gait bob only while moving. Scroll input is damped
  (`scrollState.smooth`) — wheel steps must never teleport the camera.
- Gaze grammar:
  - **0–50% — searching.** Gaze wanders the horizon; rare involuntary
    glances toward the light.
  - **50–75% — discovering.** Gaze settles ahead along the line as rails
    become readable; camera aligns with the track axis.
  - **75–100% — following.** Locked toward the signal. Inevitable.
- Occlusion: ONLY atmosphere hides the light — the mist banks swallow the
  halo and the structure, never terrain. The corridor drift is kept low
  (1.6 units, below the lamp sightline for the whole approach): a light
  glitching through a hill reads as a bug, not a mystery. **The light
  never disappears; only understanding does.**
- Railway discovery arc: bare-metal shards (`Debris.jsx`, z 21–64) glint
  ambiguously from ~25%; the rails then surface in three staggered
  segments (`Track.jsx`) starting at the SIGNAL end (~45%) and assembling
  toward the camera — and the nearest stretch never fully surfaces: the
  beginning of the line stays partially sand-covered. Discovery, not
  exposition; the sand never fully lets go.

---

## 8. Typography

Bueno family, nine weights available in `public/Fonts/`. Reference: A24
title cards, DIA Studio, museum exhibition labels, luxury publications.
Editorial — never informational, never UI.

- **Hairline throughout — the title's restraint is the system.** Thin
  strokes, wide tracking, darkness around them; hierarchy comes from SIZE
  contrast, not weight. No Bold, no Black anywhere: an archive, not a
  poster. Three voices:
  - *kicker* — Regular 400, tiny, 0.55em tracking, uppercase: the archival
    date stamp ("Day one / two / three").
  - *dominant* — ExtraLight 200, uppercase, 0.12em tracking, leading 1.15:
    the remembered sentence at display scale. The ONE weight accent in the
    piece is the final card's dominant at Light 300 (+0.14em tracking).
    The final dominant carries **no text-shadow** — it stands in the
    lamp's glow unprotected; a dark halo there reads as a mask.
  - *quiet* — ExtraLight 200, lowercase, ~50% size, hazed, offset, delayed:
    the soft fragment. Tracked open (0.085em) — hairline weights need air
    between letters to stay legible at night.
  (Ghost numerals and heavy display weights were tried and cut —
  declaration, not memory.)
- **Each beat is individually art-directed**: card 1 lower-left (left rag),
  card 2 upper-right (right rag — the rails own the lower frame at that
  beat), final on the central axis with asymmetric internals — dominant
  line, a held beat of air, then "for centuries." alone.
- Title moment: "A FIELD RECORD" kicker over "THE SIGNAL" (Light, widely
  tracked), thin rule. Fades when the journey begins.
- Cards 1 & 2: lower-third, asymmetric (left, then right), quiet.
- **The final line is the strongest typographic moment**: centered, larger,
  alone, long silence before it, slow fade with a letter-spacing settle
  (no movement). Give it room. Do not rush it.
- **Type is composed, not animated** — per-voice choreography: dominants
  surface via a clip-path sweep + reduced rise (≤1.5° settle); quiets
  *condense* out of the fog (blur 8→0, the only sanctioned blur); kickers
  fade as their tracking settles. Voices are separately timed (metadata →
  dominant +0.2s → quiet +0.7s; final quiet +1.1s). Two parallax rates
  inside each card (dominant 22px / small type 10px); the final card
  stands perfectly still. No typewriters, no generic fades/slides.
- **GSAP owns all transforms** — never put a resting transform in CSS on a
  GSAP-animated element: it gets parsed into a pixel offset in GSAP's
  cache and silently layers under every yPercent tween (this bug shipped
  once; don't reintroduce it).
- Page furniture is de-UI'd: no visible scrollbar; the scroll hint is a
  thin falling line; the sound toggle is lowercase, hairline, dim.
- Authored line breaks (rendered as masked line spans); never let text rewrap.

Copy (exact, do not paraphrase):
1. "Two days ago, the light began."
2. "Yesterday, the tracks were found."
3. "The line had been closed for centuries."

---

## 9. Scroll & pacing

The scroll is the narrative device. Guided, not interactive. Directed, not
exploratory. 900vh runway; long deliberate silences between beats:

| Beat | Scroll % |
|------|----------|
| Title visible | 0–2.5% |
| Card 1 (light) | 10–26% |
| Light occluded behind drift | ~18–35% |
| Crest — light reappears | ~37% |
| Track emergence (buried → readable) | 45–72% |
| Card 2 (tracks) | 50–64% |
| Gaze locks to signal | 74–92% |
| Card 3 (final) | 90%+ (never leaves) |
| Finale: signal turns green | >96.5%, +2.6s |

GSAP + ScrollTrigger drive the text beats; the camera reads damped raw
progress (module store, zero React re-renders).

---

## 10. Technical guardrails

- Stack: React 19 + Vite, react-three-fiber, drei, @react-three/postprocessing,
  GSAP + ScrollTrigger. KTX2 textures (transcoder in `public/basis/`,
  `dedupe: ['three']` required in Vite config).
- Architecture (do not rebuild): fixed full-viewport Canvas + fixed text
  layer + invisible scroll-driver div; mutable `scrollState` module
  (`progress` raw, `smooth` damped each frame by CameraRig).
- Sound (`Ambience.jsx`): fully procedural WebAudio, no assets, off by
  default. NOT a soundtrack — the environment gradually becomes musical:
  wind (filtered noise, slow gusts) stays as the bed; a harmonic resonance
  emerges with the journey, as if rails, wires and the signal's electrics
  share a faint hum. Root A1 (55 Hz — a transformer's voice), **open
  fifths, octaves and ninths only — no thirds, no melodies, no swells, no
  resolution**. Each voice breathes on its own slow cycle so the chord
  never arrives; two high detune-drifting partials are the telegraph
  wires singing. It should stay at the threshold of being music, and it
  remains unresolved at the end.
- Performance: dpr capped at 1.5, smaller shadow map + ground res on mobile,
  no per-frame allocation in `useFrame`, materials mutated not recreated.
- Everything must stay inside the sky dome radius and camera far plane.
- Preview quirk: hidden tabs suspend rAF — GSAP and the render loop both
  freeze; this is environmental, not a bug.

### File map
| Concern | File |
|---------|------|
| Layers/scroll driver | `src/App.jsx`, `src/index.css` |
| Scroll store | `src/store/scroll.js` (+ `refs.js` for the god-rays lens) |
| Walk + gaze phases | `src/components/CameraRig.jsx` |
| Sky / stars / afterglow | `src/components/DuskSky.jsx` |
| Fog layers, mist, dust | `src/components/Atmosphere.jsx` + `fogExp2` in `Scene.jsx` |
| The Cathedral (GLB) | `src/components/Cathedral.jsx` |
| The Signal (procedural) + lamp logic | `src/components/Signal.jsx` |
| Track emergence | `src/components/Track.jsx` |
| Corridor drift / dunes | `src/components/Ground.jsx` |
| Distant world (matte layers) | `src/components/Horizon.jsx` |
| Route furniture | `src/components/TelegraphPoles.jsx`, `Debris.jsx`, `Vegetation.jsx` |
| Grade / bloom / god rays | `src/components/PostFX.jsx` |
| Narrative text | `src/components/TextOverlay.jsx` |
| Procedural audio | `src/components/Ambience.jsx` |

---

## 11. The test for any future change

Ask, in order:
1. Does it make the audience ask *"what is that light?"* for longer?
2. Does it hide more than it reveals?
3. Does it make the world feel bigger and the visitor smaller?
4. Would a viewer notice the technique? (If yes, soften it.)
5. Does the final line still land in silence?

If any answer is no, don't ship it.
