import { Fragment } from 'react'

// Block kit. Display lines use a manual mask (.d-line > .d-line__i) so authored
// rags and per-line accent survive; flowing prose is split by GSAP SplitText.
// data-reveal marks how each element animates in; data-skew gets velocity skew.

function Eyebrow({ children, tick, accent, className = '', ...rest }) {
  return (
    <span className={`eyebrow ${tick ? 'eyebrow--tick' : ''} ${accent ? 'eyebrow--accent' : ''} ${className}`} {...rest}>
      {children}
    </span>
  )
}

function DisplayLine({ children, className = '' }) {
  return <span className="d-line"><span className={`d-line__i ${className}`}>{children}</span></span>
}

function Parallax({ src, className = '' }) {
  const isVideo = /\.(webm|mp4)$/i.test(src)
  return (
    <div className={`parallax-img ${className}`} data-parallax>
      {isVideo
        ? <video src={src} muted loop autoPlay playsInline preload="metadata" />
        : <img src={src} alt="" loading="lazy" />}
    </div>
  )
}

function Hero({ b }) {
  return (
    <header className="case-hero">
      {b.spine && <span className="hero-spine">{b.spine}</span>}
      <div className="hero-top">
        <Eyebrow tick data-reveal="fade">{b.eyebrowLeft}</Eyebrow>
        <Eyebrow accent data-reveal="fade">{b.eyebrowRight}</Eyebrow>
      </div>
      <div className="hero-mid">
        <h1 className="hero-headline" data-reveal="display">
          {b.headline.map((l, i) => (
            <DisplayLine key={i} className={i === b.accentLine ? 'accent' : ''}>{l}</DisplayLine>
          ))}
        </h1>
        <span className="hero-rule" />
        <p className="hero-subhead" data-reveal="lines">{b.subhead}</p>
      </div>
      <div className="hero-foot">
        <Eyebrow data-reveal="fade">{b.meta}</Eyebrow>
        <span className="num">{b.index}</span>
      </div>
    </header>
  )
}

function Facts({ b }) {
  return (
    <section className="facts" data-reveal="settle">
      {b.items.map(({ key, value }, i) => (
        <div className="facts__item" key={i}>
          <span className="facts__k">{key}</span>
          <span className="facts__v">{value}</span>
        </div>
      ))}
    </section>
  )
}

function Movement({ b }) {
  return (
    <section className="movement">
      <div className="movement__aside" data-reveal="fade">
        {b.num && <span className="movement__num">{b.num}</span>}
        <Eyebrow tick accent className="movement__label">{b.label}</Eyebrow>
      </div>
      {b.heading && (
        <h2 className="movement__heading" data-reveal="display">
          {b.heading.map((l, i) => <DisplayLine key={i}>{l}</DisplayLine>)}
        </h2>
      )}
      <div className="movement__body">
        {b.paragraphs.map((p, i) => <p key={i} data-reveal="lines">{p}</p>)}
      </div>
    </section>
  )
}

function Split({ b }) {
  return (
    <section className={`split ${b.side === 'right' ? 'split--right' : ''}`}>
      <div className="split__text"><p data-reveal="lines">{b.text}</p></div>
      <div className="split__media"><Parallax src={b.image} /></div>
    </section>
  )
}

function FullBleed({ b }) {
  return (
    <figure className="fullbleed">
      <Parallax src={b.image} />
      {b.caption && <figcaption><Eyebrow tick data-reveal="fade">{b.caption}</Eyebrow></figcaption>}
    </figure>
  )
}

function Reel({ b }) {
  return (
    <figure className="reel">
      <div className="parallax-img" data-parallax>
        <video src={b.src} muted loop autoPlay playsInline preload="metadata" />
      </div>
      {b.caption && <figcaption><Eyebrow tick data-reveal="fade">{b.caption}</Eyebrow></figcaption>}
    </figure>
  )
}

function Statement({ b }) {
  return (
    <section className="statement">
      <h2>
        {b.lines.map((l, i) => (
          <span key={i} className={i === b.accentLine ? 'accent' : ''}>{l}</span>
        ))}
      </h2>
    </section>
  )
}

function NextCase({ b }) {
  return (
    <a className="next-case" href={b.href}>
      <div className="next-case__media">
        {b.image && <img src={b.image} alt="" loading="lazy" />}
        {!b.image && b.video && <video src={b.video} muted loop autoPlay playsInline preload="metadata" />}
      </div>
      <Eyebrow tick accent data-reveal="fade">Next</Eyebrow>
      <span className="next-case__title" data-reveal="fade">{b.title}</span>
      <span className="next-case__cls" data-reveal="fade">{b.cls}</span>
    </a>
  )
}

function Quote({ b }) {
  return (
    <section className="quote">
      <blockquote data-reveal="display">
        <span className="quote__mark" aria-hidden="true">“</span>
        {b.lines.map((l, i) => <DisplayLine key={i} className="quote__line">{l}</DisplayLine>)}
      </blockquote>
    </section>
  )
}

function Testimonial({ b }) {
  return (
    <section className="testimonial">
      <blockquote data-reveal="lines">“{b.quote}”</blockquote>
      <footer data-reveal="fade">
        <span className="testimonial__name">{b.name}</span>
        {b.role && <span className="testimonial__role">{b.role}</span>}
        {b.source && <span className="testimonial__source">{b.source}</span>}
      </footer>
    </section>
  )
}

function Gallery({ b }) {
  return (
    <section className="gallery">
      {b.images.map((src, i) => (
        <figure key={i} className="gallery__item"><img src={src} alt="" loading="lazy" data-skew /></figure>
      ))}
    </section>
  )
}

function Credits({ b }) {
  return (
    <section className="credits">
      <dl data-reveal="settle">
        {b.items.map(({ key, value }, i) => (
          <Fragment key={i}><dt>{key}</dt><dd>{value}</dd></Fragment>
        ))}
      </dl>
    </section>
  )
}

function CaseIndex({ b }) {
  return (
    <footer className="case-index">
      <Eyebrow tick accent className="case-index__label" data-reveal="fade">{b.label}</Eyebrow>
      <ul className="case-index__list">
        {b.items.map((it, i) => (
          <li className="case-index__row" key={i}>
            <a href={it.href}>
              <span className="case-index__num">{String(i + 1).padStart(2, '0')}</span>
              <span className="case-index__title">{it.title}</span>
              <span className="case-index__cls">{it.cls}</span>
              <span className="case-index__arrow" aria-hidden="true">→</span>
            </a>
          </li>
        ))}
      </ul>
      <div className="case-footer__bar">
        <a className="case-url" href={`https://${b.url}`}>{b.url.toUpperCase()}</a>
        <span className="num">{b.index}</span>
      </div>
    </footer>
  )
}

export function Block({ block }) {
  switch (block.type) {
    case 'hero':      return <Hero b={block} />
    case 'facts':     return <Facts b={block} />
    case 'movement':  return <Movement b={block} />
    case 'split':     return <Split b={block} />
    case 'fullbleed': return <FullBleed b={block} />
    case 'reel':      return <Reel b={block} />
    case 'statement': return <Statement b={block} />
    case 'next':      return <NextCase b={block} />
    case 'quote':     return <Quote b={block} />
    case 'testimonial': return <Testimonial b={block} />
    case 'gallery':   return <Gallery b={block} />
    case 'credits':   return <Credits b={block} />
    case 'index':     return <CaseIndex b={block} />
    default:          return null
  }
}
