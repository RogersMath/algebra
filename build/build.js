#!/usr/bin/env node
/**
 * build/build.js
 * MAT1033C SLC Survival Guide — Static content injector
 *
 * Reads course.json + all formula JSONs and injects:
 *   1. A hidden semantic HTML section for crawlers/agents/screen readers
 *   2. JSON-LD structured data (Schema.org LearningResource)
 *   3. sitemap.xml
 *   4. robots.txt
 *
 * Usage:
 *   node build/build.js
 *
 * Run from the repo root. Reads index.html, writes index.html in place.
 * Safe to run repeatedly — injection markers ensure idempotency.
 *
 * @author Jesse Rogers
 * @institution Palm Beach State College
 * @license MIT
 */

const fs   = require('fs');
const path = require('path');

const ROOT      = path.resolve(__dirname, '..');
const COURSE    = require(path.join(ROOT, 'course.json'));
const INDEX_SRC = path.join(ROOT, 'index.html');
const SITE_URL  = 'https://rogersmath.github.io/algebra';

// ── 1. Load all formula JSONs ─────────────────────────────────────────────────

function loadFormulas() {
  const formulaDir = path.join(ROOT, 'formulas');
  const all = {};
  fs.readdirSync(formulaDir)
    .filter(f => f.endsWith('.json'))
    .forEach(f => {
      const data = JSON.parse(fs.readFileSync(path.join(formulaDir, f), 'utf8'));
      all[data.id] = data;
    });
  return all;
}

// ── 2. Build hidden semantic HTML ─────────────────────────────────────────────

function buildCrawlableHTML(course, formulas) {
  const sections = course.sections.map(section => {
    const formulaBlocks = section.formulas.map(id => {
      const f = formulas[id];
      if (!f) return '';

      const notes = (f.notes ?? [])
        .map(n => `<li>${escapeHTML(n)}</li>`).join('');

      const examples = (f.examples ?? [])
        .map(ex => `
          <div class="seo-example">
            <p>${escapeHTML(ex.description)}</p>
            <p><code>${escapeHTML(ex.latex)}</code></p>
          </div>`).join('');

      const applications = (f.applications ?? [])
        .map(a => `<li>${escapeHTML(a)}</li>`).join('');

      const related = (f.related ?? [])
        .map(r => `<a href="#formula/${r.id}">${escapeHTML(formatId(r.id))}</a>`)
        .join(', ');

      return `
        <article id="formula-${f.id}" itemscope itemtype="https://schema.org/DefinedTerm">
          <h3 itemprop="name">${escapeHTML(f.title)}</h3>
          <p class="seo-latex" aria-label="${escapeHTML(f.aria_label ?? f.title)}">
            <code itemprop="description">${escapeHTML(f.latex)}</code>
          </p>
          ${notes ? `<ul class="seo-notes" aria-label="Notes about ${escapeHTML(f.title)}">${notes}</ul>` : ''}
          ${examples ? `<section aria-label="Examples for ${escapeHTML(f.title)}">${examples}</section>` : ''}
          ${applications ? `<ul class="seo-applications" aria-label="Applications of ${escapeHTML(f.title)}">${applications}</ul>` : ''}
          ${related ? `<p>Related: ${related}</p>` : ''}
        </article>`;
    }).join('');

    return `
      <section id="${section.id}" aria-labelledby="section-${section.id}">
        <h2 id="section-${section.id}">${escapeHTML(section.title)}</h2>
        ${formulaBlocks}
      </section>`;
  }).join('');

  return `
<!-- SEO: static content for crawlers, agents, and no-JS users -->
<!-- build:seo -->
<div id="seo-content"
     aria-hidden="true"
     style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;"
     itemscope
     itemtype="https://schema.org/Course">
  <h1 itemprop="name">${escapeHTML(course.title)}</h1>
  <p itemprop="description">${escapeHTML(course.description)}</p>
  <p itemprop="provider" itemscope itemtype="https://schema.org/EducationalOrganization">
    <span itemprop="name">Palm Beach State College</span>
  </p>
  ${sections}
</div>
<!-- /build:seo -->`;
}

// ── 3. Build JSON-LD ──────────────────────────────────────────────────────────

function buildJsonLD(course, formulas) {
  const hasPart = [];

  course.sections.forEach(section => {
    section.formulas.forEach(id => {
      const f = formulas[id];
      if (!f) return;
      hasPart.push({
        '@type': 'LearningResource',
        '@id': `${SITE_URL}#formula-${f.id}`,
        'name': f.title,
        'description': (f.notes ?? []).join(' '),
        'educationalLevel': f.difficulty === 1 ? 'Foundational'
                          : f.difficulty === 2 ? 'Intermediate'
                          : 'Advanced',
        'learningResourceType': 'Formula Reference',
        'inLanguage': ['en', 'es', 'ht'],
        'isPartOf': { '@id': SITE_URL },
      });
    });
  });

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': ['LearningResource', 'WebApplication'],
    '@id': SITE_URL,
    'name': 'Algebra SLC Survival Guide',
    'alternateName': 'MAT1033C Formula Reference',
    'description': course.description,
    'url': SITE_URL,
    'inLanguage': ['en', 'es', 'ht'],
    'isAccessibleForFree': true,
    'license': 'https://opensource.org/licenses/MIT',
    'educationalLevel': ['developmental algebra', 'intermediate algebra', 'college algebra'],
    'learningResourceType': 'Reference',
    'audience': {
      '@type': 'EducationalAudience',
      'educationalRole': 'student',
    },
    'provider': {
      '@type': 'EducationalOrganization',
      'name': 'Palm Beach State College',
      'url': 'https://pbsc.edu',
    },
    'author': {
      '@type': 'Person',
      'name': 'Jesse Rogers',
      'affiliation': {
        '@type': 'EducationalOrganization',
        'name': 'Palm Beach State College',
      },
    },
    'hasPart': hasPart,
    'applicationCategory': 'EducationalApplication',
    'operatingSystem': 'Any',
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'USD',
    },
  };

  return `
<!-- build:jsonld -->
<script type="application/ld+json">
${JSON.stringify(jsonld, null, 2)}
</script>
<!-- /build:jsonld -->`;
}

// ── 4. Inject into index.html ─────────────────────────────────────────────────

function injectIntoHTML(html, seoBlock, jsonldBlock) {
  // Remove previous injections if re-running
  html = html.replace(/<!-- build:seo -->[\s\S]*?<!-- \/build:seo -->/g, '');
  html = html.replace(/<!-- build:jsonld -->[\s\S]*?<!-- \/build:jsonld -->/g, '');

  // Inject SEO block just before </body>
  html = html.replace('</body>', `${seoBlock}\n</body>`);

  // Inject JSON-LD in <head> just before </head>
  html = html.replace('</head>', `${jsonldBlock}\n</head>`);

  return html;
}

// ── 5. Generate sitemap.xml ───────────────────────────────────────────────────

function buildSitemap(course) {
  const today = new Date().toISOString().split('T')[0];

  // One entry for the main page + one per formula for future per-page expansion
  const urls = [
    `  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>`,
    ...course.sections.flatMap(s =>
      s.formulas.map(id => `  <url>
    <loc>${SITE_URL}/#formula/${id}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.7</priority>
  </url>`)
    ),
  ].join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

// ── 6. Generate robots.txt ────────────────────────────────────────────────────

function buildRobots() {
  return `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

// ── UTILS ─────────────────────────────────────────────────────────────────────

function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatId(id) {
  return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

function main() {
  console.log('Building static content injection...\n');

  const formulas = loadFormulas();
  console.log(`✓ Loaded ${Object.keys(formulas).length} formula JSONs`);

  const html       = fs.readFileSync(INDEX_SRC, 'utf8');
  const seoBlock   = buildCrawlableHTML(COURSE, formulas);
  const jsonldBlock = buildJsonLD(COURSE, formulas);
  const injected   = injectIntoHTML(html, seoBlock, jsonldBlock);

  fs.writeFileSync(INDEX_SRC, injected, 'utf8');
  console.log('✓ Injected SEO HTML and JSON-LD into index.html');

  const sitemap = buildSitemap(COURSE);
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');
  console.log('✓ Generated sitemap.xml');

  const robots = buildRobots();
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), robots, 'utf8');
  console.log('✓ Generated robots.txt');

  console.log('\nBuild complete.');
  console.log(`  Formulas indexed: ${Object.keys(formulas).length}`);
  console.log(`  Sitemap entries:  ${1 + Object.keys(formulas).length}`);
}

main();