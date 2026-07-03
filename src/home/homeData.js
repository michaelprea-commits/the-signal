// Homepage content — lives in src/content/home.json (editable via the Decap
// CMS at /admin). This file just re-exports it so HomeApp/HomeScene imports
// stay unchanged.
import data from '../content/home.json'

export const panels = data.panels
export const intro = data.intro
