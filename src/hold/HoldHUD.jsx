// Persistent, minimal HUD — the wayfinding spine. Hairline editorial type,
// lowercase, dim (de-UI'd, like The Signal's sound toggle). Identical chrome
// across states is what keeps a spatial site feeling calm.
//
// The container is pointer-events:none; only the links opt back in, so clicks
// on empty space still reach the crates behind the canvas.
export function HoldHUD({ phase, onClose }) {
  const reading = phase === 'dossier'

  return (
    <div className="hold-hud">
      <div className="hold-hud__brand">
        <span className="hold-hud__mark">The Hold</span>
        <span className="hold-hud__sub">facility 12 · containment archive</span>
      </div>

      <div className="hold-hud__right">
        <span className="hold-hud__count">specimen 037 / 60</span>
        {reading
          ? <button className="hold-hud__link" onClick={onClose}>← back to facility</button>
          : <button className="hold-hud__link"
              onClick={() => window.scrollTo({ top: window.innerHeight * 2.4, behavior: 'smooth' })}>
              skip to the index
            </button>}
      </div>

      {!reading && (
        <div className="hold-hud__hint">
          <span className="hold-hud__hintline" aria-hidden="true" />
          <span>scroll to descend · click a crate to open its file</span>
        </div>
      )}
    </div>
  )
}
