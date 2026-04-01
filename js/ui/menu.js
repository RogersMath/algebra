/**
 * ui/menu.js
 * MAT1033C SLC Survival Guide
 * Hamburger drawer: open, close, overlay, keyboard trap, ARIA.
 *
 * @author Jesse Rogers
 * @institution Palm Beach State College
 * @license MIT
 */

import { navigateToSection } from './render.js';
import { setLanguage, SUPPORTED } from '../i18n.js';

/**
 * initMenu — wire up hamburger button, overlay, and nav links.
 * @param {Object} AppState
 */
export function initMenu(AppState) {
  const hamburger = document.getElementById('hamburger');
  const sidemenu  = document.getElementById('sidemenu');
  const overlay   = document.getElementById('menuOverlay');

  if (!hamburger || !sidemenu || !overlay) return;

  // Build nav links from course sections
  buildMenuLinks(sidemenu, AppState);

  hamburger.addEventListener('click', () => toggleMenu(sidemenu, overlay, hamburger));
  overlay.addEventListener('click',   () => closeMenu(sidemenu, overlay, hamburger));

  // Keyboard: Escape closes menu
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sidemenu.classList.contains('open')) {
      closeMenu(sidemenu, overlay, hamburger);
      hamburger.focus();
    }
  });
}

/**
 * buildMenuLinks — inject <a> elements from course sections.
 * @param {HTMLElement} sidemenu
 * @param {Object}      AppState
 */
function buildMenuLinks(sidemenu, AppState) {
  const { sections, lang, course } = AppState;
  sidemenu.innerHTML = '';

  sections.forEach((section, idx) => {
    const a = document.createElement('a');
    a.className    = 'menu-link';
    a.href         = `#${section.id}`;
    a.textContent  = section.translations?.[lang]?.title ?? section.title;
    a.dataset.idx  = idx;
    a.setAttribute('role', 'menuitem');

    a.addEventListener('click', e => {
      e.preventDefault();
      const overlay  = document.getElementById('menuOverlay');
      const sidemenu = document.getElementById('sidemenu');
      const hamburger = document.getElementById('hamburger');
      closeMenu(sidemenu, overlay, hamburger);
      navigateToSection(AppState, idx);
    });

    sidemenu.appendChild(a);
  });

  // Mark first link active initially
  updateActiveLink(sidemenu, 0);

  // Language switcher below section links
  buildLangSwitcher(sidemenu, AppState);
}

/**
 * buildLangSwitcher — inject a divider and language select into the drawer.
 * @param {HTMLElement} sidemenu
 * @param {Object}      AppState
 */
function buildLangSwitcher(sidemenu, AppState) {
  const lang = AppState.lang;

  // Divider
  const divider = document.createElement('div');
  divider.className = 'menu-divider';
  divider.setAttribute('aria-hidden', 'true');
  sidemenu.appendChild(divider);

  // Label + select wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'lang-switcher';

  const label = document.createElement('label');
  label.htmlFor   = 'langSelect';
  label.className = 'lang-label';
  label.textContent = '🌐 Language';

  const select = document.createElement('select');
  select.id        = 'langSelect';
  select.className = 'lang-select';
  select.setAttribute('aria-label', 'Select language');

  const langNames = { en: 'English', es: 'Español', ht: 'Kreyòl ayisyen' };

  SUPPORTED.forEach(code => {
    const opt = document.createElement('option');
    opt.value       = code;
    opt.textContent = (lang === code ? '✓ ' : '') + langNames[code];
    opt.selected    = code === lang;
    if (code === lang) {
      opt.style.fontWeight = '700';
      opt.style.color      = '#C8973A';
    }
    select.appendChild(opt);
  });

  select.addEventListener('change', () => {
    setLanguage(select.value);
  });

  wrapper.appendChild(label);
  wrapper.appendChild(select);
  sidemenu.appendChild(wrapper);
}

/**
 * updateActiveLink — highlight the current section in the drawer.
 * Called by render.js when section changes.
 * @param {HTMLElement} sidemenu
 * @param {number}      idx
 */
export function updateActiveLink(sidemenu, idx) {
  if (!sidemenu) return;
  sidemenu.querySelectorAll('.menu-link').forEach((a, i) => {
    a.classList.toggle('active', i === idx);
    a.setAttribute('aria-current', i === idx ? 'page' : 'false');
  });
}

function toggleMenu(sidemenu, overlay, hamburger) {
  const isOpen = sidemenu.classList.contains('open');
  isOpen ? closeMenu(sidemenu, overlay, hamburger)
         : openMenu(sidemenu, overlay, hamburger);
}

function openMenu(sidemenu, overlay, hamburger) {
  sidemenu.classList.add('open');
  overlay.classList.add('active');
  hamburger.setAttribute('aria-expanded', 'true');
  // Make background content inert (WCAG focus trap pattern)
  document.getElementById('mainContent')?.setAttribute('inert', '');
  document.getElementById('dotNav')?.setAttribute('inert', '');
  document.querySelector('footer')?.setAttribute('inert', '');
  // Move focus to first menu link
  const first = sidemenu.querySelector('.menu-link');
  if (first) first.focus();
}

export function closeMenu(sidemenu, overlay, hamburger) {
  sidemenu.classList.remove('open');
  overlay.classList.remove('active');
  hamburger?.setAttribute('aria-expanded', 'false');
  // Restore background content
  document.getElementById('mainContent')?.removeAttribute('inert');
  document.getElementById('dotNav')?.removeAttribute('inert');
  document.querySelector('footer')?.removeAttribute('inert');
}