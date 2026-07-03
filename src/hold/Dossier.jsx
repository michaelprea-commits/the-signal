// The dossier — the case study itself. A normal, scrollable, long-form
// document skinned as a containment file. Colour returns here (the facility
// was desaturated; the work is finally *out*). Placeholder copy and colour
// plates stand in for CMS-driven content + real imagery.
//
// This is the calm reading island. The 3D is the door; this is the room.
export function Dossier({ open, onClose, onNext }) {
  return (
    <div className={`hold-dossier ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="hold-dossier__scroll">
        <header className="hold-dossier__head">
          <span className="hold-dossier__kicker">Specimen 037 — released</span>
          <h1>Deceive Inc.</h1>
          <p className="hold-dossier__meta">Launch site · Triplehill / 2023 · game website</p>
        </header>

        <div className="hold-dossier__hero" />

        <section>
          <span className="hold-dossier__label">Containment procedures</span>
          <p>A stealth-comedy multiplayer with a tonal problem: it had to feel
            genuinely dangerous and genuinely absurd in the same breath, and the
            site had to hold both without picking a side. The brief was a single
            sentence and a launch date. Everything else had to be contained.</p>
        </section>

        <section>
          <span className="hold-dossier__label">Description</span>
          <p>The specimen presents as a spy agency that does not know it is a
            joke. We built the identity straight-faced — corporate, clipped,
            over-confident — and let the wit leak out of the seams rather than
            the headline. Motion was kept to a slow institutional calm so the
            absurdity landed harder against it.</p>
          <div className="hold-dossier__plate" />
          <div className="hold-dossier__plate" />
          <p>Long-form holds here without strain: process notes, art direction,
            the full image gallery, embedded captures. The container never
            argues with the reading — the chrome recedes and the work is the
            loudest thing on screen.</p>
        </section>

        <section>
          <span className="hold-dossier__label">Incident log</span>
          <p>Three things fought back: the tone, the load budget, and a launch
            window that moved twice. Notes on each, and what we abandoned to keep
            the rest intact.</p>
        </section>

        <section>
          <span className="hold-dossier__label">Recovery &amp; deployment</span>
          <p>Shipped on date. Coverage, metrics, the credits roll. Containment
            holds — for now.</p>
        </section>

        <footer className="hold-dossier__foot">
          <button className="hold-hud__link" onClick={onClose}>← back to facility</button>
          <button className="hold-hud__link" onClick={onNext}>next specimen →</button>
        </footer>
      </div>
    </div>
  )
}
