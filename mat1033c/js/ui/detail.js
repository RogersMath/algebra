/**
 * ui/detail.js
 * MAT1033C SLC Survival Guide
 * Formula detail panel: slides in from the right, shows full formula data.
 * Back button and swipe-right both close it.
 *
 * @author Jesse Rogers
 * @institution Palm Beach State College
 * @license MIT
 */

import { loadFormula, getCached } from '../loader.js';
import { t, tVideo }              from '../i18n.js';
import { setHash }                from '../router.js';
import { navigateToSection }      from './render.js';

/**
 * initDetail — wire back button. Panel HTML already exists in index.html.
 * @param {Object} AppState
 */
export function initDetail(AppState) {
  const panel   = document.querySelector('.formula-detail');
  const backBtn = document.querySelector('.detail-back-btn');
  if (!panel || !backBtn) return;

  backBtn.addEventListener('click', () => closeDetail(AppState));

  // Keyboard: Escape closes detail
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && AppState.detailOpen) closeDetail(AppState);
  });
}

/**
 * openDetail — load formula data and slide panel in.
 * Uses cached data if available, otherwise fetches.
 * @param {Object} AppState
 * @param {string} id  formula id
 */
export async function openDetail(AppState, id) {
  const panel = document.querySelector('.formula-detail');
  const inner = document.querySelector('.detail-inner');
  if (!panel || !inner) return;

  AppState.detailOpen   = true;
  AppState.activeFormula = id;
  setHash(`formula/${id}`);

  // Show loading state immediately
  inner.innerHTML = '<div class="detail-loading" aria-live="polite">Loading…</div>';
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');

  // Trap focus inside panel
  const backBtn = document.querySelector('.detail-back-btn');
  if (backBtn) backBtn.focus();

  // Load (cache-first)
  const formula = getCached(id) ?? await loadFormula(id);
  const lang    = AppState.lang;

  inner.innerHTML = buildDetailHTML(formula, lang, AppState);

  // MathJax re-render
  if (window.MathJax?.typesetPromise) {
    await window.MathJax.typesetPromise([inner]);
  }

  // Wire related formula links
  inner.querySelectorAll('.related-link').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const relId = a.dataset.id;
      const sIdx  = AppState.sections.findIndex(s => s.formulas.includes(relId));
      if (sIdx !== -1) navigateToSection(AppState, sIdx, false);
      openDetail(AppState, relId);
    });
  });
}

/**
 * closeDetail — slide panel out and restore section hash.
 * @param {Object} AppState
 */
export function closeDetail(AppState) {
  const panel = document.querySelector('.formula-detail');
  if (!panel) return;

  AppState.detailOpen   = false;
  AppState.activeFormula = null;
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');

  // Restore section hash
  const section = AppState.sections[AppState.currentSection];
  if (section) setHash(section.id);

  // Return focus to main content
  document.getElementById('mainContent')?.focus();
}

// ─── HTML BUILDERS ────────────────────────────────────────────────────────────

function buildDetailHTML(formula, lang, AppState) {
  const title        = t(formula, 'title', lang);
  const notes        = t(formula, 'notes', lang) ?? [];
  const examples     = t(formula, 'examples', lang) ?? [];
  const applications = formula.applications ?? [];
  const related      = formula.related ?? [];
  const videoURL     = tVideo(formula, lang);
  const difficulty   = buildDifficultyBadge(formula.difficulty);

  return `
    <div class="detail-header">
      <h2 class="detail-title">${escapeHTML(title)}</h2>
      ${difficulty}
    </div>

    <div class="detail-formula"
         aria-label="${escapeHTML(formula.aria_label ?? title)}">
      \\[${formula.latex}\\]
    </div>

    ${notes.length ? `
    <section class="detail-section" aria-labelledby="notes-heading">
      <h3 id="notes-heading" class="detail-section-title">Notes</h3>
      <ul class="detail-notes">
        ${notes.map(n => `<li>${escapeHTML(n)}</li>`).join('')}
      </ul>
    </section>` : ''}

    ${examples.length ? `
    <section class="detail-section" aria-labelledby="examples-heading">
      <h3 id="examples-heading" class="detail-section-title">Examples</h3>
      <div class="detail-examples">
        ${examples.map(ex => buildExampleHTML(ex)).join('')}
      </div>
    </section>` : ''}

    ${applications.length ? `
    <section class="detail-section" aria-labelledby="applications-heading">
      <h3 id="applications-heading" class="detail-section-title">Applications</h3>
      <ul class="detail-applications">
        ${applications.map(a => `<li>${escapeHTML(a)}</li>`).join('')}
      </ul>
    </section>` : ''}

    ${related.length ? `
    <section class="detail-section" aria-labelledby="related-heading">
      <h3 id="related-heading" class="detail-section-title">Related Formulas</h3>
      <div class="related-chips">
        ${related.map(r => buildRelatedChip(r, AppState)).join('')}
      </div>
    </section>` : ''}

    ${videoURL ? `
    <div class="detail-video">
      <a href="${videoURL}"
         target="_blank"
         rel="noopener"
         class="video-btn"
         aria-label="Watch Khan Academy video for ${escapeHTML(title)} (opens in new tab)">
        ▶ Watch on Khan Academy
      </a>
    </div>` : ''}
  `;
}

function buildExampleHTML(ex) {
  return `
    <div class="example-block">
      <p class="example-description">${escapeHTML(ex.description)}</p>
      <div class="example-math" aria-label="Example: ${escapeHTML(ex.description)}">
        \\[${ex.latex}\\]
      </div>
    </div>
  `;
}

function buildRelatedChip(rel, AppState) {
  // Find a display label from cache if available
  const cached = AppState.formulaCache?.[rel.id];
  const label  = cached ? t(cached, 'title', AppState.lang) : formatId(rel.id);
  const badge  = rel.relationship ? `<span class="rel-type">${formatRelType(rel.relationship)}</span>` : '';
  return `
    <a href="#formula/${rel.id}"
       class="related-link"
       data-id="${rel.id}"
       aria-label="Go to ${escapeHTML(label)}">
      ${escapeHTML(label)}${badge}
    </a>
  `;
}

function buildDifficultyBadge(level) {
  if (!level) return '';
  const labels = { 1: 'Foundational', 2: 'Core', 3: 'Advanced' };
  const label  = labels[level] ?? '';
  return `<span class="difficulty-badge difficulty-${level}" aria-label="Difficulty: ${label}">${label}</span>`;
}

// ─── UTILS ───────────────────────────────────────────────────────────────────

function formatId(id) {
  return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatRelType(rel) {
  const map = {
    equivalent_form:    'equiv',
    application:        'applies',
    derived_from:       'from',
    companion_formula:  'see also',
    contains:           'contains',
    contained_in:       'part of',
    prerequisite:       'prereq',
    alternative_method: 'alt',
    special_case:       'special case',
    parallel_pattern:   'pattern',
    generalization:     'generalizes',
    shares_coordinates: 'coord',
    shares_expression:  'expr',
    inverse_operation:  'inverse',
    extension:          'extends',
    parallel_rule:      'parallel',
  };
  return map[rel] ?? rel;
}

function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
