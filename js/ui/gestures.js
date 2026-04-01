/**
 * ui/gestures.js
 * MAT1033C SLC Survival Guide
 * Touch gesture handling:
 *   - Swipe left/right anywhere → section navigation (highest priority)
 *   - Swipe right on detail panel → close detail
 *
 * Swipe takes priority over card taps. Cards only open when finger
 * movement is below the tap threshold (handled in render.js wireCards).
 *
 * @author Jesse Rogers
 * @institution Palm Beach State College
 * @license MIT
 */

import { navigateToSection } from './render.js';
import { closeDetail }       from './detail.js';
import { clearGlow }         from './render.js';

const SWIPE_THRESHOLD = 50; // px — minimum horizontal travel to count as swipe

/**
 * initGestures — attach all touch handlers.
 * @param {Object} AppState
 */
export function initGestures(AppState) {
  initSectionSwipe(AppState);
  initDetailSwipe(AppState);
}

// ─── SECTION SWIPE ────────────────────────────────────────────────────────────

function initSectionSwipe(AppState) {
  let startX   = 0;
  let startY   = 0;
  let tracking = false;

  // Record start position on any touch — including over cards
  document.addEventListener('touchstart', e => {
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

    // Must be horizontal-dominant
    if (Math.abs(dy) > Math.abs(dx)) return;
    // Must exceed swipe threshold
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;

    // It's a swipe — clear any card glow and navigate
    clearGlow(AppState);
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
