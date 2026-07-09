import forza from '../content/cases/forza.json'
import turn10 from '../content/cases/turn10.json'
import studiotypes from '../content/cases/studiotypes.json'
import illustration from '../content/cases/illustration.json'
import animation from '../content/cases/animation.json'
import battleRoad from '../content/cases/battle-road.json'
import heyBird from '../content/cases/hey-bird.json'

// Registry of all case studies. Content lives in src/content/cases/*.json
// (editable via the Decap CMS at /admin). Order doubles as the archive order:
// the homepage headliners first, then the deeper cuts.
const source = [forza, turn10, studiotypes, illustration, animation, battleRoad, heyBird]
// shallow-clone each project + its blocks array so we never mutate the
// imported JSON module (Vite caches it; mutating in place would compound
// across HMR reloads)
const list = source.map((p) => ({ ...p, blocks: [...p.blocks] }))

// Auto-fill each study's closing index with the *other* studies, so the
// "More work" list never has to be maintained by hand per project — and append
// a cinematic "next" handoff pointing at the following study in the archive.
list.forEach((proj, k) => {
  const idxAt = proj.blocks.findIndex((b) => b.type === 'index')
  if (idxAt !== -1) {
    proj.blocks[idxAt] = {
      ...proj.blocks[idxAt],
      items: list
        .filter((p) => p.slug !== proj.slug)
        .map((p) => ({ title: p.title, cls: p.cls, href: `/work/${p.slug}` })),
    }
  }
  const nxt = list[(k + 1) % list.length]
  const isVideo = (src) => /\.(webm|mp4|mov)$/i.test(src || '')
  const media = [...nxt.blocks].find((b) => (b.type === 'fullbleed' || b.type === 'split') && !isVideo(b.image))
  const reel = nxt.blocks.find((b) => b.type === 'reel')
    || nxt.blocks.find((b) => b.type === 'fullbleed' && isVideo(b.image))
  proj.blocks.push({
    type: 'next', title: nxt.title, cls: nxt.cls, href: `/work/${nxt.slug}`,
    image: media ? media.image : '', video: !media && reel ? (reel.src || reel.image) : '',
  })
})

export const CASES = Object.fromEntries(list.map((p) => [p.slug, p]))
