/**
 * loader.js
 * MAT1033C SLC Survival Guide
 * Handles all data fetching. Lazy-loads formula JSON on demand.
 * Caches responses in memory so each file is fetched at most once per session.
 *
 * @author Jesse Rogers
 * @institution Palm Beach State College
 * @license MIT
 */

const BASE = new URL('../', import.meta.url).href;  // repo root relative to /js/
const cache = {};

/**
 * loadCourse — fetches course.json once.
 * @returns {Promise<Object>} parsed course manifest
 */
export async function loadCourse() {
  if (cache['__course__']) return cache['__course__'];
  const res  = await fetch(`${BASE}course.json`);
  if (!res.ok) throw new Error(`Failed to load course.json: ${res.status}`);
  cache['__course__'] = await res.json();
  return cache['__course__'];
}

/**
 * loadFormula — fetches a single formula JSON by id, with cache.
 * @param {string} id  formula id, e.g. 'slope'
 * @returns {Promise<Object>} parsed formula object
 */
export async function loadFormula(id) {
  if (cache[id]) return cache[id];
  const res = await fetch(`${BASE}formulas/${id}.json`);
  if (!res.ok) throw new Error(`Failed to load formula: ${id} (${res.status})`);
  cache[id] = await res.json();
  return cache[id];
}

/**
 * preloadSection — eagerly fetches all formulas in a section.
 * Called when a section becomes active to warm the cache for detail taps.
 * @param {string[]} formulaIds  array of formula id strings
 */
export async function preloadSection(formulaIds) {
  await Promise.allSettled(formulaIds.map(id => loadFormula(id)));
}

/**
 * getCached — synchronous cache read (returns null if not yet loaded).
 * Used by detail.js to avoid async in tap handlers when cache is warm.
 * @param {string} id
 * @returns {Object|null}
 */
export function getCached(id) {
  return cache[id] ?? null;
}
