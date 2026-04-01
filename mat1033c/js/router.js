/**
 * router.js
 * MAT1033C SLC Survival Guide
 * Hash-based router. Handles:
 *   #linear, #quadratics, etc.  → section navigation
 *   #formula/slope               → open formula detail directly
 *
 * @author Jesse Rogers
 * @institution Palm Beach State College
 * @license MIT
 */

import { navigateToSection } from './ui/render.js';
import { openDetail }        from './ui/detail.js';

/**
 * initRouter — binds hashchange listener and processes the initial hash.
 * @param {Object} AppState
 */
export function initRouter(AppState) {
  window.addEventListener('hashchange', () => handleHash(AppState));
  handleHash(AppState);
}

/**
 * handleHash — parse window.location.hash and route accordingly.
 * @param {Object} AppState
 */
function handleHash(AppState) {
  const raw  = window.location.hash.slice(1); // strip leading #
  if (!raw) return;

  // Formula detail route: #formula/slope
  if (raw.startsWith('formula/')) {
    const id = raw.slice('formula/'.length);
    const sectionIdx = findSectionForFormula(id, AppState.sections);
    if (sectionIdx !== -1) navigateToSection(AppState, sectionIdx, false);
    openDetail(AppState, id);
    return;
  }

  // Section route: #linear, #quadratics, etc.
  const sectionIdx = AppState.sections.findIndex(s => s.id === raw);
  if (sectionIdx !== -1) {
    navigateToSection(AppState, sectionIdx);
  }
}

/**
 * setHash — update the URL hash without triggering a full page reload.
 * Called by render.js and detail.js to keep URL in sync.
 * @param {string} hash   e.g. 'linear' or 'formula/slope'
 */
export function setHash(hash) {
  history.replaceState(null, '', `#${hash}`);
}

/**
 * findSectionForFormula — find which section contains a given formula id.
 * @param {string}   id
 * @param {Object[]} sections
 * @returns {number} section index, or -1
 */
function findSectionForFormula(id, sections) {
  return sections.findIndex(s => s.formulas.includes(id));
}
