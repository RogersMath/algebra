/**
 * engine.js
 * MAT1033C SLC Survival Guide
 * Thin conductor — orchestrates subsystem initialization only.
 * No rendering, no DOM manipulation, no business logic here.
 *
 * @author Jesse Rogers
 * @institution Palm Beach State College
 * @license MIT
 */

import { loadCourse, loadFormula } from './loader.js';
import { getLanguage, setLanguage }  from './i18n.js';
import { initRouter }                from './router.js';
import { initMenu }                  from './ui/menu.js';
import { initRender }                from './ui/render.js';
import { initDetail }                from './ui/detail.js';
import { initGestures }              from './ui/gestures.js';

/**
 * AppState — single source of truth passed to all UI modules.
 * UI modules read from it; only the engine and loader write to it.
 */
const AppState = {
  course:       null,   // course.json contents
  lang:         'en',   // active language code
  sections:     [],     // ordered section metadata from course.json
  formulaCache: {},     // { [id]: formulaObject } — populated lazily
  currentSection: 0,    // index into sections[]
  detailOpen:   false,  // whether detail panel is visible
  activeFormula: null,  // id of formula currently in detail panel
};

/**
 * initApp — called once on DOMContentLoaded.
 * Returns AppState so render.js can wire up reactive updates.
 */
async function initApp() {
  // 1. Resolve language (URL param > localStorage > browser > default)
  AppState.lang = getLanguage();

  // 2. Load course manifest
  AppState.course   = await loadCourse();
  AppState.sections = AppState.course.sections;

  // 3. Boot UI subsystems (order matters — render before gestures)
  initMenu(AppState);
  initRender(AppState);
  initDetail(AppState);
  initGestures(AppState);

  // 4. Activate hash router last (may trigger immediate navigation)
  initRouter(AppState);

  return AppState;
}

export default { initApp };
export { AppState };
