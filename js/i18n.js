/**
 * i18n.js
 * MAT1033C SLC Survival Guide
 * Language resolution, persistence, and localized field helpers.
 * Supports: en, es, ht
 *
 * @author Jesse Rogers
 * @institution Palm Beach State College
 * @license MIT
 */

const SUPPORTED  = ['en', 'es', 'ht'];
const DEFAULT    = 'en';
const STORAGE_KEY = 'mat1033c_lang';

/**
 * getLanguage — resolves active language in priority order:
 *   1. ?lang= URL parameter
 *   2. localStorage
 *   3. navigator.language prefix
 *   4. DEFAULT ('en')
 * @returns {string} language code
 */
export function getLanguage() {
  const param = new URLSearchParams(window.location.search).get('lang');
  if (param && SUPPORTED.includes(param)) return param;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED.includes(stored)) return stored;

  const browser = (navigator.language || '').slice(0, 2).toLowerCase();
  if (SUPPORTED.includes(browser)) return browser;

  return DEFAULT;
}

/**
 * setLanguage — persists language choice and reloads page to re-render.
 * @param {string} lang
 */
export function setLanguage(lang) {
  if (!SUPPORTED.includes(lang)) return;
  localStorage.setItem(STORAGE_KEY, lang);
  // Preserve hash, update ?lang= param
  const url = new URL(window.location.href);
  url.searchParams.set('lang', lang);
  window.location.href = url.toString();
}

/**
 * t — get a localized field from a formula or section object.
 * Falls back to English if the field isn't translated.
 *
 * @param {Object} obj      formula or section object
 * @param {string} field    field name, e.g. 'title', 'notes', 'examples'
 * @param {string} lang     active language code
 * @returns {*}             localized value or English fallback
 */
export function t(obj, field, lang) {
  if (lang === DEFAULT || !obj.translations?.[lang]?.[field]) {
    return obj[field];
  }
  return obj.translations[lang][field];
}

/**
 * tSection — get a localized section title.
 * Sections store translations directly on the section object.
 *
 * @param {Object} section
 * @param {string} lang
 * @returns {string}
 */
export function tSection(section, lang) {
  if (lang === DEFAULT || !section.translations?.[lang]?.title) {
    return section.title;
  }
  return section.translations[lang].title;
}

/**
 * tVideo — get the video URL for the active language, with fallback to EN.
 * Returns null if no video is available at all.
 *
 * @param {Object} formula
 * @param {string} lang
 * @returns {string|null}
 */
export function tVideo(formula, lang) {
  const video = formula.video;
  if (!video) return null;
  return video[lang] ?? video['en'] ?? null;
}

/**
 * tCTA — get the localized call-to-action text from course.ui.cta.
 * @param {Object} course
 * @param {string} lang
 * @returns {string}
 */
export function tCTA(course, lang) {
  return course?.ui?.cta?.[lang] ?? course?.ui?.cta?.['en'] ?? '';
}

export { SUPPORTED, DEFAULT };
