/**
 * ui/render.js
 * MAT1033C SLC Survival Guide
 * Renders section cards, dot nav, arrow buttons.
 * Handles section-to-section transitions.
 *
 * @author Jesse Rogers
 * @institution Palm Beach State College
 * @license MIT
 */

import { loadFormula, preloadSection } from '../loader.js';
import { t, tSection, tCTA }           from '../i18n.js';
import { setHash }                     from '../router.js';
import { updateActiveLink }            from './menu.js';
import { openDetail }                  from './detail.js';

const TRANSITION_MS = 220;

/**
 * initRender — build initial DOM structure and render first section.
 * @param {Object} AppState
 */
export function initRender(AppState) {
  buildChrome(AppState);       // dots, arrows, footer CTA
  renderSection(AppState, 0);  // paint section 0 immediately
  preloadSection(AppState.sections[0].formulas); // warm cache
}

// ─── DOM BUILDERS ─────────────────────────────────────────────────────────────

function buildChrome(AppState) {
  buildDots(AppState);
  buildArrows(AppState);
  buildFooterCTA(AppState);
}

function buildDots(AppState) {
  const container = document.getElementById('dotNav');
  if (!container) return;
  container.innerHTML = '';
  AppState.sections.forEach((_, i) => {
    const btn = document.createElement('button');
    btn.className  = 'dot';
    btn.dataset.idx = i;
    btn.setAttribute('aria-label', `Go to section ${i + 1}`);
    btn.addEventListener('click', () => navigateToSection(AppState, i));
    container.appendChild(btn);
  });
  updateDots(AppState.sections.length, 0);
}

function buildArrows(AppState) {
  const left  = document.getElementById('arrowLeft');
  const right = document.getElementById('arrowRight');
  if (left)  left.addEventListener('click',  () => navigateToSection(AppState, AppState.currentSection - 1));
  if (right) right.addEventListener('click', () => navigateToSection(AppState, AppState.currentSection + 1));
  updateArrows(0, AppState.sections.length);
}

function buildFooterCTA(AppState) {
  const footer = document.querySelector('footer');
  if (!footer) return;
  const url  = AppState.course.ui?.cta_url ?? 'https://pbsc.edu/slc/';
  const text = tCTA(AppState.course, AppState.lang);
  footer.innerHTML = `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;
}

// ─── SECTION RENDERING ────────────────────────────────────────────────────────

/**
 * renderSection — fetch all formula cards for a section and inject into main.
 * @param {Object} AppState
 * @param {number} idx
 */
async function renderSection(AppState, idx) {
  const main    = document.getElementById('mainContent');
  const section = AppState.sections[idx];
  if (!main || !section) return;

  // Show skeleton while loading
  main.innerHTML = buildSkeleton(section.formulas.length);

  // Fetch all formulas (parallel, cache-aware)
  const formulas = await Promise.all(
    section.formulas.map(id => loadFormula(id))
  );

  // Build section HTML
  main.innerHTML = buildSectionHTML(section, formulas, AppState.lang);

  // Wire card interactions
  wireCards(main, AppState);

  // Trigger MathJax render if available
  if (window.MathJax?.typesetPromise) {
    await window.MathJax.typesetPromise([main]);
  }
}

function buildSectionHTML(section, formulas, lang) {
  const title = tSection(section, lang);
  const cards = formulas.map(f => buildCardHTML(f, lang)).join('');
  return `
    <h2 class="family-title">${escapeHTML(title)}</h2>
    <div class="formula-grid" role="list">
      ${cards}
    </div>
  `;
}

function buildCardHTML(formula, lang) {
  const title = t(formula, 'title', lang);
  // aria-label uses the plain-English description for screen readers
  return `
    <div class="formula-card"
         role="listitem"
         data-id="${formula.id}"
         tabindex="0"
         aria-label="Open ${escapeHTML(title)}"
         aria-haspopup="true">
      <h3 class="formula-title">${escapeHTML(title)}</h3>
      <div class="formula-math"
           aria-label="${escapeHTML(formula.aria_label ?? title)}">
        \\[${formula.latex}\\]
      </div>
      <div class="card-gold-layer" aria-hidden="true"></div>
    </div>
  `;
}

function buildSkeleton(count) {
  return Array.from({ length: count }, () =>
    `<div class="formula-card skeleton" aria-hidden="true">
      <div class="skeleton-title"></div>
      <div class="skeleton-math"></div>
    </div>`
  ).join('');
}

// ─── CARD INTERACTION WIRING ──────────────────────────────────────────────────

function wireCards(container, AppState) {
  container.querySelectorAll('.formula-card').forEach(card => {
    const id = card.dataset.id;

    // Desktop: hover → glow, click → open
    card.addEventListener('mouseenter', () => card.classList.add('glowing'));
    card.addEventListener('mouseleave', () => card.classList.remove('glowing'));
    card.addEventListener('click', () => openDetail(AppState, id));

    // Keyboard: Enter or Space → open
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDetail(AppState, id);
      }
    });

    // Mobile: single tap → brief glow, then open
    card.addEventListener('touchend', e => {
      e.preventDefault(); // prevent ghost click firing the click handler too
      card.classList.add('glowing');
      setTimeout(() => openDetail(AppState, id), 120);
    });
  });
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────

/**
 * navigateToSection — transition to a new section with direction-aware animation.
 * Exported so router.js, menu.js, and gestures.js can call it.
 * @param {Object}  AppState
 * @param {number}  idx
 * @param {boolean} updateHash  default true
 */
export async function navigateToSection(AppState, idx, updateHash = true) {
  const total = AppState.sections.length;
  if (idx < 0 || idx >= total || idx === AppState.currentSection) return;

  const prev = AppState.currentSection;
  AppState.currentSection = idx;

  updateDots(total, idx);
  updateArrows(idx, total);
  updateActiveLink(document.getElementById('sidemenu'), idx);
  if (updateHash) setHash(AppState.sections[idx].id);

  await renderSection(AppState, idx);

  // Preload adjacent sections for instant response
  const next = AppState.sections[idx + 1];
  const back = AppState.sections[idx - 1];
  if (next) preloadSection(next.formulas);
  if (back) preloadSection(back.formulas);
}

// ─── UI STATE HELPERS ─────────────────────────────────────────────────────────

function updateDots(total, active) {
  document.querySelectorAll('.dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === active);
    dot.setAttribute('aria-pressed', i === active ? 'true' : 'false');
  });
}

function updateArrows(idx, total) {
  const left  = document.getElementById('arrowLeft');
  const right = document.getElementById('arrowRight');
  if (left)  left.disabled  = idx === 0;
  if (right) right.disabled = idx === total - 1;
}

// ─── UTILS ───────────────────────────────────────────────────────────────────

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
