/**
 * sw.js — Service Worker
 * MAT1033C SLC Survival Guide
 * Caches all app shell and formula JSON files for offline use.
 *
 * Strategy:
 *   - App shell (HTML, CSS, JS, fonts): Cache First
 *   - Formula JSON: Cache First with network fallback
 *   - External resources (MathJax, Google Fonts): Network First with cache fallback
 *
 * @author Jesse Rogers
 * @institution Palm Beach State College
 * @license MIT
 */

const CACHE_VERSION  = 'mat1033c-v1';
const CACHE_DYNAMIC  = 'mat1033c-dynamic-v1';

// App shell — everything needed to render without network
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './course.json',
  './manifest.json',
  './js/engine.js',
  './js/loader.js',
  './js/router.js',
  './js/i18n.js',
  './js/ui/render.js',
  './js/ui/detail.js',
  './js/ui/gestures.js',
  './js/ui/menu.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  // All formula JSONs — precache so detail panel works offline
  './formulas/slope.json',
  './formulas/point_slope.json',
  './formulas/slope_intercept.json',
  './formulas/midpoint.json',
  './formulas/distance.json',
  './formulas/standard_form.json',
  './formulas/vertex_form.json',
  './formulas/factored_form.json',
  './formulas/quadratic_formula.json',
  './formulas/discriminant.json',
  './formulas/axis_of_symmetry.json',
  './formulas/product_rule.json',
  './formulas/quotient_rule.json',
  './formulas/power_rule.json',
  './formulas/radical_product.json',
  './formulas/fractional_exponent.json',
  './formulas/difference_of_squares.json',
  './formulas/sum_of_cubes.json',
  './formulas/difference_of_cubes.json',
  './formulas/average_rate_of_change.json',
];

// ── INSTALL: precache app shell ───────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: purge old caches ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION && k !== CACHE_DYNAMIC)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: serve from cache, fall back to network ─────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // External requests (MathJax, Google Fonts) — network first, cache fallback
  if (url.origin !== self.location.origin) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // App shell and formula JSON — cache first, network fallback
  event.respondWith(cacheFirstWithNetwork(request));
});

async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_DYNAMIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline and not cached — return a simple offline message for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return new Response('<p style="font-family:serif;padding:2rem;">You are offline. Please reconnect to load the Algebra SLC Survival Guide.</p>',
        { headers: { 'Content-Type': 'text/html' } });
    }
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_DYNAMIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response('Offline', { status: 503 });
  }
}