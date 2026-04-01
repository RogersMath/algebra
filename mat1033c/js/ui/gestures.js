/**
 * ui/gestures.js
 * MAT1033C SLC Survival Guide
 * Touch gesture handling:
 *   - Swipe left/right on main content → section navigation
 *   - Swipe right on detail panel      → close detail
 *   - Drag on formula card             → reveal gold layer, trigger open at threshold
 *
 * @author Jesse Rogers
 * @institution Palm Beach State College
 * @license MIT
 */

import { navigateToSection } from './render.js';
import { openDetail, closeDetail } from './detail.js';

const SWIPE_THRESHOLD  = 50;   // px — minimum horizontal swipe distance
const DRAG_OPEN_THRESHOLD = 80; // px — card drag distance to trigger open
const DRAG_GOLD_START  = 10;   // px — drag distance before gold layer appears

/**
 * initGestures — attach all touch handlers.
 * @param {Object} AppState
 */
export function initGestures(AppState) {
  initSectionSwipe(AppState);
  initDetailSwipe(AppState);
  // Card drag is wired per-card in render.js wireCards()
  // but the drag logic itself lives here as an exported helper.
}

// ─── SECTION SWIPE ────────────────────────────────────────────────────────────

function initSectionSwipe(AppState) {
  const main = document.getElementById('mainContent');
  if (!main) return;

  let startX = 0;
  let startY = 0;
  let tracking = false;

  document.addEventListener('touchstart', e => {
    // Don't intercept if detail panel is open or touch is inside it
    if (AppState.detailOpen) return;
    if (e.target.closest('.formula-detail')) return;
    startX   = e.touches[0].clientX;
    startY   = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (!tracking || AppState.detailOpen) return;
    tracking = false;

    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;

    // Ignore vertical-dominant swipes (scrolling)
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;

    if (dx < 0) navigateToSection(AppState, AppState.currentSection + 1);
    else        navigateToSection(AppState, AppState.currentSection - 1);
  }, { passive: true });
}

// ─── DETAIL PANEL SWIPE-RIGHT TO CLOSE ───────────────────────────────────────

function initDetailSwipe(AppState) {
  const panel = document.querySelector('.formula-detail');
  if (!panel) return;

  let startX = 0;

  panel.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  panel.addEventListener('touchend', e => {
    if (!AppState.detailOpen) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (dx > SWIPE_THRESHOLD) closeDetail(AppState);
  }, { passive: true });
}

// ─── CARD DRAG-TO-REVEAL ──────────────────────────────────────────────────────

/**
 * attachCardDrag — called by render.js wireCards() for each formula card.
 * Animates the gold layer on horizontal drag and opens detail at threshold.
 *
 * @param {HTMLElement} card
 * @param {string}      id       formula id
 * @param {Object}      AppState
 */
export function attachCardDrag(card, id, AppState) {
  const goldLayer = card.querySelector('.card-gold-layer');
  if (!goldLayer) return;

  let startX  = 0;
  let dragging = false;

  card.addEventListener('touchstart', e => {
    startX   = e.touches[0].clientX;
    dragging = false;
  }, { passive: true });

  card.addEventListener('touchmove', e => {
    const dx = e.touches[0].clientX - startX;
    if (dx < DRAG_GOLD_START) return;

    dragging = true;
    // Clamp progress 0–1
    const progress = Math.min(dx / DRAG_OPEN_THRESHOLD, 1);
    goldLayer.style.opacity = progress;
    goldLayer.style.transform = `scaleX(${progress})`;
    card.classList.add('dragging');
  }, { passive: true });

  card.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    resetCardDrag(card, goldLayer);

    if (dragging && dx >= DRAG_OPEN_THRESHOLD) {
      openDetail(AppState, id);
    }
  }, { passive: true });

  card.addEventListener('touchcancel', () => {
    resetCardDrag(card, goldLayer);
  }, { passive: true });
}

function resetCardDrag(card, goldLayer) {
  card.classList.remove('dragging');
  goldLayer.style.opacity   = '';
  goldLayer.style.transform = '';
}
