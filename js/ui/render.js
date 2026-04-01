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

/**
 * clearGlow — remove .glowing from whichever card currently has it,
 * and blur it so :focus-visible doesn't linger.
 * @param {Object} AppState
 */
export function clearGlow(AppState) {
  if (AppState.glowingCard) {
    AppState.glowingCard.classList.remove('glowing');
    AppState.glowingCard.blur();
    AppState.glowingCard = null;
  }
}

/**
 * setGlow — clear any existing glow, then apply to a single card.
 * @param {Object}      AppState
 * @param {HTMLElement} card
 */
function setGlow(AppState, card) {
  clearGlow(AppState);
  AppState.glowingCard = card;
  card.classList.add('glowing');
}

/**
 * initRender — build initial DOM structure and render first section.
 * @param {Object} AppState
 */
export function initRender(AppState) {
  // Ensure AppState has the glowingCard slot
  AppState.glowingCard = null;

  buildChrome(AppState);
  renderSection(AppState, 0);
  preloadSection(AppState.sections[0].formulas);

  // Any tap/click on a non-card area clears glow
  document.addEventListener('touchstart', e => {
    if (!e.target.closest('.formula-card')) clearGlow(AppState);
  }, { passive: true });
  document.addEventListener('mousedown', e => {
    if (!e.target.closest('.formula-card')) clearGlow(AppState);
  });
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
    btn.className   = 'dot';
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

async function renderSection(AppState, idx) {
  const main    = document.getElementById('mainContent');
  const section = AppState.sections[idx];
  if (!main || !section) return;

  // Clear any lingering glow before re-rendering cards
  AppState.glowingCard = null;

  main.innerHTML = buildSkeleton(section.formulas.length);

  const formulas = await Promise.all(
    section.formulas.map(id => loadFormula(id))
  );

  main.innerHTML = buildSectionHTML(section, formulas, AppState.lang);

  wireCards(main, AppState);

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

    // ── DESKTOP ──────────────────────────────────────────────────
    // Hover: glow while mouse is over card
    card.addEventListener('mouseenter', () => setGlow(AppState, card));
    card.addEventListener('mouseleave', () => clearGlow(AppState));
    // Click: open detail (mouse users — no touch involved)
    card.addEventListener('click', e => {
      if (e.detail === 0) return; // keyboard-triggered click, handled by keydown
      openDetail(AppState, id);
    });

    // ── KEYBOARD ─────────────────────────────────────────────────
    // Tab focus: glow the focused card, clear all others
    card.addEventListener('focus', () => setGlow(AppState, card));
    card.addEventListener('blur',  () => clearGlow(AppState));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDetail(AppState, id);
      }
    });

    // ── MOBILE ───────────────────────────────────────────────────
    // touchstart: record position for swipe detection
    let touchStartX = 0;
    let touchStartY = 0;
    card.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    // touchend: only open if finger didn't travel — yield to swipe otherwise
    card.addEventListener('touchend', e => {
      const dx = Math.abs(e.changedTouches[0].clientX - touchStartX);
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);

      // If finger moved more than 10px in any direction, treat as scroll/swipe — don't open
      if (dx > 10 || dy > 10) return;

      e.preventDefault(); // suppress ghost click
      setGlow(AppState, card);
      setTimeout(() => openDetail(AppState, id), 120);
    });
  });
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────

export async function navigateToSection(AppState, idx, updateHash = true) {
  const total = AppState.sections.length;
  if (idx < 0 || idx >= total || idx === AppState.currentSection) return;

  clearGlow(AppState); // clear focus state on section change

  AppState.currentSection = idx;

  updateDots(total, idx);
  updateArrows(idx, total);
  updateActiveLink(document.getElementById('sidemenu'), idx);
  if (updateHash) setHash(AppState.sections[idx].id);

  await renderSection(AppState, idx);

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
