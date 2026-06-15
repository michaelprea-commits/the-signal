import { useEffect, useRef, useState } from 'react'
import { scrollState } from '../store/scroll'

// Procedural ambience — no audio assets, everything synthesised.
//
//   Wind:  looped noise through a slow-modulated lowpass. Desert at night.
//          Present from the first second; the bed everything sits in.
//
//   Resonance: the environment becoming musical. Buried rails, telegraph
//          wires and the signal's electrics share a faint harmonic hum —
//          root A1 (55 Hz, a transformer's voice), open fifths and ninths
//          only. No thirds, so it never resolves to major or minor; each
//          voice swells and recedes on its own slow cycle, so the chord
//          never arrives anywhere. It emerges gradually with the journey
//          and remains suspended at the end. The listener should not be
//          sure it's music at all.
//
//   Wires: two high, faint partials with slowly drifting detune —
//          telegraph wires singing in the wind.
//
//   Dissonance: a minor second — C6 (1046 Hz) against C#6 (1109 Hz) —
//          through a cold programmatic reverb, wet-only. Emerges with the
//          "Yesterday" beat (p≈0.43); peaks near the final reveal. The
//          interval never resolves. Felt more than heard.
//
// Off by default; browsers require a gesture anyway.

const A1 = 55

// [frequency, peak gain, swell rate Hz] — open fifths, octaves, ninths.
// Swell rates are irrational-ish so the voices never sync.
const VOICES = [
  [A1,        0.042, 0.013],   // root — the transformer
  [A1 * 1.5,  0.030, 0.021],   // fifth
  [A1 * 2,    0.026, 0.017],   // octave
  [A1 * 2.25, 0.024, 0.029],   // ninth — the unresolved colour
  [A1 * 3,    0.016, 0.011],   // fifth, octave up
  [A1 * 4,    0.011, 0.023],   // double octave
  [A1 * 4.5,  0.009, 0.033],   // ninth again, higher and lonelier
]

// [frequency, peak gain, shimmer rate Hz] — the wire song
const WIRES = [
  [A1 * 9,  0.0050, 0.047],    // ~495 Hz, a ninth
  [A1 * 12, 0.0038, 0.061],    // ~660 Hz, a fifth
]

function buildGraph() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()

  const master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  // ── Wind ──
  const len = ctx.sampleRate * 2
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1

  const src = ctx.createBufferSource()
  src.buffer = buf
  src.loop = true

  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 320
  lowpass.Q.value = 0.7

  const windGain = ctx.createGain()
  windGain.gain.value = 0.16

  src.connect(lowpass)
  lowpass.connect(windGain)
  windGain.connect(master)
  src.start()

  // Gusts — two slow LFOs on filter frequency and wind level
  const lfo1 = ctx.createOscillator()
  lfo1.frequency.value = 0.05
  const lfo1Gain = ctx.createGain()
  lfo1Gain.gain.value = 120
  lfo1.connect(lfo1Gain)
  lfo1Gain.connect(lowpass.frequency)
  lfo1.start()

  const lfo2 = ctx.createOscillator()
  lfo2.frequency.value = 0.083
  const lfo2Gain = ctx.createGain()
  lfo2Gain.gain.value = 0.05
  lfo2.connect(lfo2Gain)
  lfo2Gain.connect(windGain.gain)
  lfo2.start()

  // ── Harmonic resonance ──
  // All voices feed droneGain, whose level follows journey progress.
  const droneGain = ctx.createGain()
  droneGain.gain.value = 0
  droneGain.connect(master)

  VOICES.forEach(([freq, peak, swellRate], i) => {
    const voiceGain = ctx.createGain()
    // Base sits at half-peak; the LFO swings it between ~0 and peak,
    // so every voice keeps arriving and leaving.
    voiceGain.gain.value = peak * 0.5
    voiceGain.connect(droneGain)

    // Two oscillators a few cents apart — a slow, breathing beat
    ;[-1.4, 1.4].forEach(cents => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.detune.value = cents
      const g = ctx.createGain()
      g.gain.value = 0.5
      osc.connect(g)
      g.connect(voiceGain)
      osc.start()
    })

    const swell = ctx.createOscillator()
    swell.frequency.value = swellRate
    // Stagger phases by starting each LFO slightly in the future
    const swellGain = ctx.createGain()
    swellGain.gain.value = peak * 0.5
    swell.connect(swellGain)
    swellGain.connect(voiceGain.gain)
    swell.start(ctx.currentTime + i * 0.7)
  })

  // ── Wire song ──
  WIRES.forEach(([freq, peak, shimmerRate], i) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq

    // Detune drifts slowly — pitch bends the way wire tension does
    const drift = ctx.createOscillator()
    drift.frequency.value = 0.05 + i * 0.023
    const driftGain = ctx.createGain()
    driftGain.gain.value = 7 // ± cents
    drift.connect(driftGain)
    driftGain.connect(osc.detune)
    drift.start()

    const wireGain = ctx.createGain()
    wireGain.gain.value = peak * 0.5
    const shimmer = ctx.createOscillator()
    shimmer.frequency.value = shimmerRate
    const shimmerGain = ctx.createGain()
    shimmerGain.gain.value = peak * 0.5
    shimmer.connect(shimmerGain)
    shimmerGain.connect(wireGain.gain)
    shimmer.start(ctx.currentTime + 1.3 + i)

    osc.connect(wireGain)
    wireGain.connect(droneGain)
    osc.start()
  })

  // ── Dissonance layer: minor second C6 / C#6 ─────────────────────────────
  // Wet-only path through a cold programmatic reverb — no dry signal.
  // The sound lives entirely in the room, not in the source.
  // Chain: oscillators → voiceGain → dissonanceGain → toneFilter → convolver → master
  const C6  = 1046.50   // high C
  const CS6 = 1108.73   // high C# — one semitone above

  // Cold reverb IR built from shaped noise — no asset file required.
  // 80 ms pre-delay creates the sense of vast distance before the tail arrives.
  // Decay constant 0.95 ≈ 3.8 s RT60 — enormous, cold, unhurried.
  const dsRate = ctx.sampleRate
  const dsIR   = ctx.createBuffer(2, Math.ceil(dsRate * 5.0), dsRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = dsIR.getChannelData(ch)
    for (let i = 0; i < d.length; i++) {
      const t   = i / dsRate
      const pre = Math.max(0, Math.min(1, (t - 0.08) / 0.06))
      const atk = Math.min(1, t / 0.15)
      const dec = Math.exp(-t * 0.95)
      d[i] = (Math.random() * 2 - 1) * pre * atk * dec
    }
  }

  const dsConv = ctx.createConvolver()
  dsConv.buffer = dsIR   // normalize = true by default

  const dsReverbOut = ctx.createGain()
  dsReverbOut.gain.value = 0.32
  dsConv.connect(dsReverbOut)
  dsReverbOut.connect(master)

  // Gentle tone shaping before reverb: removes any harshness from the tones,
  // retains the glassy upper partials that give them their cold character.
  const dsTone = ctx.createBiquadFilter()
  dsTone.type = 'lowpass'
  dsTone.frequency.value = 2400
  dsTone.Q.value = 0.45

  // Very slow filter sweep — the 2nd/3rd partials breathe while the
  // fundamentals pass unchanged. ~91 s per full cycle.
  const dsFilterLFO = ctx.createOscillator()
  dsFilterLFO.frequency.value = 0.011
  const dsFilterLFOGain = ctx.createGain()
  dsFilterLFOGain.gain.value = 650   // ±650 Hz around 2400
  dsFilterLFO.connect(dsFilterLFOGain)
  dsFilterLFOGain.connect(dsTone.frequency)
  dsFilterLFO.start()

  // Master dissonance gain — starts silent; scroll-driven in setInterval below
  const dissonanceGain = ctx.createGain()
  dissonanceGain.gain.value = 0
  dissonanceGain.connect(dsTone)
  dsTone.connect(dsConv)

  // Glassy pad waveform: fundamental + very quiet 2nd + trace 3rd partial.
  // Pure sine would be too clean; this adds just enough timbre to read as
  // a pad rather than a test tone, while staying cold and digital.
  const dsWave = ctx.createPeriodicWave(
    new Float32Array([0, 1.0, 0.10, 0.03]),
    new Float32Array([0, 0,   0,    0   ]),
  )

  // Four oscillators: C6 ×2 and C#6 ×2, micro-detuned pairs for width.
  // [frequency, static_detune_cents, pitch_drift_rate_Hz, swell_phase_offset_s]
  const DS_VOICES = [
    [C6,   1.1, 0.021, 0.0],
    [C6,  -1.1, 0.017, 3.2],
    [CS6,  0.8, 0.027, 7.1],
    [CS6, -0.8, 0.023, 5.5],
  ]

  DS_VOICES.forEach(([freq, detCents, driftHz, swellOffset], i) => {
    const osc = ctx.createOscillator()
    osc.setPeriodicWave(dsWave)
    osc.frequency.value = freq
    osc.detune.value = detCents

    // Individual pitch drift — each voice wanders independently
    const driftLFO = ctx.createOscillator()
    driftLFO.frequency.value = driftHz
    const driftLFOGain = ctx.createGain()
    driftLFOGain.gain.value = 5.5   // ±5.5 cents of drift
    driftLFO.connect(driftLFOGain)
    driftLFOGain.connect(osc.detune)
    driftLFO.start(ctx.currentTime + i * 4.1)  // staggered phases

    // Very slow amplitude swell — choral breathing, periods of 88–180 s
    const swellLFO = ctx.createOscillator()
    swellLFO.frequency.value = 0.0055 + i * 0.0019
    const swellLFOGain = ctx.createGain()
    swellLFOGain.gain.value = 0.09

    const voiceGain = ctx.createGain()
    voiceGain.gain.value = 0.22
    swellLFO.connect(swellLFOGain)
    swellLFOGain.connect(voiceGain.gain)
    swellLFO.start(ctx.currentTime + swellOffset)

    osc.connect(voiceGain)
    voiceGain.connect(dissonanceGain)
    osc.start()
  })

  master.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.5)

  // Journey coupling: wind eases slightly as the resonance surfaces.
  // The drone emerges from ~10% scroll and never fully blooms — it stays
  // at the threshold of being music.
  const intervalId = setInterval(() => {
    const p = scrollState.smooth
    const emergence = Math.pow(Math.max(p - 0.08, 0) / 0.92, 1.5)
    droneGain.gain.setTargetAtTime(emergence * 1.0, ctx.currentTime, 0.8)
    windGain.gain.setTargetAtTime(0.16 - p * 0.05, ctx.currentTime, 0.8)
    // Dissonance: emerges just before "Yesterday" (p≈0.43), peaks near the
    // final reveal. TC=2.5 s ensures no audible step even at 250 ms poll rate.
    const dsFade = Math.max(0, Math.min(1, (p - 0.40) / 0.22))
    const dsPeak = Math.max(0, Math.min(1, (p - 0.80) / 0.20))
    dissonanceGain.gain.setTargetAtTime(dsFade * 0.24 + dsPeak * 0.16, ctx.currentTime, 2.5)
  }, 250)

  return { ctx, intervalId }
}

export function Ambience() {
  const [on, setOn] = useState(false)
  const graphRef = useRef(null)

  useEffect(() => {
    if (on) {
      if (graphRef.current) graphRef.current.ctx.resume()
      else graphRef.current = buildGraph()
    } else if (graphRef.current) {
      graphRef.current.ctx.suspend()
    }
  }, [on])

  useEffect(() => () => {
    if (graphRef.current) {
      clearInterval(graphRef.current.intervalId)
      graphRef.current.ctx.close()
    }
  }, [])

  return (
    <button
      className="sound-toggle"
      data-on={on}
      onClick={() => setOn(v => !v)}
      aria-pressed={on}
    >
      {on ? 'sound — on' : 'sound — off'}
    </button>
  )
}
