// Auditoría visual e2e completa del portafolio (estado real del navegador).
// Recorre TODAS las páginas verificando: carga, red, consola, nav cápsula,
// capas de scrub, animaciones activas, interacciones de hover, reduced motion
// y el scrub engine funcionando durante el scroll real.
import { chromium } from '@playwright/test';

const results = [];
const check = (name, pass, detail) => results.push({ name, pass, detail });

const BASE = process.env.BASE_URL || 'http://localhost:4321';
const browser = await chromium.launch();

// Expectativas específicas por página
const PAGE_CONFIG = {
  '/': { orbs: 2, scrubMin: 3, ctas: 1, metricCards: 4 },
  '/about': { orbs: 1, scrubMin: 1, ctas: 1, metricCards: 0 },
  '/projects/commons-marketplace': { orbs: 1, scrubMin: 1, ctas: 1, metricCards: 4 },
  '/projects/deployment-automation': { orbs: 1, scrubMin: 1, ctas: 1, metricCards: 4 },
  '/projects/pathfinder': { orbs: 1, scrubMin: 1, ctas: 1, metricCards: 4 },
  '/projects/vaniabot': { orbs: 1, scrubMin: 1, ctas: 1, metricCards: 4 },
};

for (const [path, cfg] of Object.entries(PAGE_CONFIG)) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const failedRequests = [];
  const pageErrors = [];
  const consoleErrors = [];
  page.on('requestfailed', (r) => failedRequests.push(r.url()));
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });

  const res = await page.goto(BASE + path, { waitUntil: 'networkidle' });

  check(`${path} → responde 200`, res.status() === 200, res.status());

  // Carga de estilos y tema
  const cssState = await page.evaluate(() => {
    const sheets = document.styleSheets.length;
    const rules = [...document.styleSheets].reduce((n, s) => n + s.cssRules.length, 0);
    return { sheets, rules };
  });
  check(`${path} → hojas de estilo cargadas`, cssState.sheets > 0 && cssState.rules > 50,
    `hojas: ${cssState.sheets}, reglas: ${cssState.rules}`);

  // Fondo del body: en la paleta clara el body es transparente y se pinta
  // sobre el gradiente de html/body; por eso getComputedStyle devuelve rgba(0,0,0,0).
  // Lo que importa es que no esté pintado con un negro profundo de tema oscuro.
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check(`${path} → no fondo oscuro`, bodyBg === 'rgba(0, 0, 0, 0)', bodyBg);

  // Nav líquida flotante en todas las páginas: el contenedor es fixed,
  // la píldora interior es la cápsula con el material
  const nav = await page.evaluate(() => {
    const navFixed = getComputedStyle(document.querySelector('nav')).position;
    const pill = document.querySelector('.glass-nav-pill');
    if (!pill) return null;
    const s = getComputedStyle(pill);
    return { navFixed, backdrop: s.backdropFilter || s.webkitBackdropFilter, radius: s.borderRadius };
  });
  check(`${path} → nav cápsula flotante`, !!nav && nav.radius === '9999px' && nav.navFixed === 'fixed', JSON.stringify(nav));
  check(`${path} → nav con backdrop-filter`, (nav?.backdrop || '').includes('blur'), nav?.backdrop);

  // Capas del sistema parallax
  const scrub = await page.locator('[data-scrub]').count();
  check(`${path} → capas scrub ≥ ${cfg.scrubMin}`, scrub >= cfg.scrubMin, `encontradas: ${scrub}`);

  // Orbes aurora con su animación activa
  const orbs = await page.evaluate(() =>
    [...document.querySelectorAll('.aurora-orb')].map((el) => getComputedStyle(el).animationName)
  );
  check(`${path} → ${cfg.orbs} orbes aurora animados`,
    orbs.length === cfg.orbs && orbs.every((n) => n === 'orb-drift'), JSON.stringify(orbs));

  // CTA glassProminent y panes de métrica según la página
  const ctas = await page.locator('a.cta-glass').count();
  check(`${path} → ${cfg.ctas} CTA glass prominente`, ctas === cfg.ctas, `encontrados: ${ctas}`);
  const metricCards = await page.locator('.metric-card').count();
  check(`${path} → ${cfg.metricCards} panes de métrica`, metricCards === cfg.metricCards, `encontrados: ${metricCards}`);

  // ─── Dimensiones: iconos y targets táctiles ───
  const dims = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('svg[width]')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { w: r.width, h: r.height };
      })
      // Skip SVGs of 0x0: they are hidden containers of defs (e.g., liquid glass refraction filter), not icons
      .filter((b) => b.w > 0 && b.h > 0);
    const minIcon = boxes.length ? Math.min(...boxes.map((b) => Math.min(b.w, b.h))) : null;
    const squares = boxes.every((b) => Math.abs(b.w - b.h) < 1);
    const targets = [
      ...document.querySelectorAll('nav a, a.glass-chip, a.cta-glass'),
    ].sort((a, b) => a.getBoundingClientRect().height - b.getBoundingClientRect().height);
    const minTarget = targets[0]?.getBoundingClientRect().height ?? null;
    return { icons: boxes.length, minIcon, squares, minTarget };
  });
  // Pages sin iconos inline (project pages) pasan; las que tienen, deben ser
  // cuadrados y de al menos 14px (nada de iconos remotamente illégibles).
  check(`${path} → iconos cuadrados ≥ 14px (${dims.icons})`,
    dims.icons === 0 || (dims.squares && dims.minIcon >= 14),
    `count: ${dims.icons}, min: ${dims.minIcon}px`);
  check(`${path} → targets táctiles ≥ 40px`, dims.minTarget >= 40, `min: ${dims.minTarget}px`);

  // Red y consola limpias
  check(`${path} → sin requests fallidos`, failedRequests.length === 0, failedRequests);
  check(`${path} → sin errores de página/consola`,
    pageErrors.length === 0 && consoleErrors.length === 0, JSON.stringify({ pageErrors, consoleErrors }));

  // Captura para inspección visual
  await page.screenshot({ path: `/tmp/opencode/audit${path === '/' ? '-home' : path.replace(/\//g, '-') }.png`, fullPage: true });
  await page.close();
}

// ─── Interacciones reales en la home ───
const home = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await home.goto(BASE + '/', { waitUntil: 'networkidle' });

// Hover chip: el borde y el glow reaccionan
const chip = home.locator('a.glass-chip').first();
const chipBefore = await chip.evaluate((el) => getComputedStyle(el).borderColor);
await chip.hover();
// 600ms: en headless el computed del hover no refleja el cambio tras wait muy cortos (transition 150ms + recalcs)
await home.waitForTimeout(600);
const chipAfter = await chip.evaluate((el) => getComputedStyle(el).borderColor);
check('hover chip → borde reacciona', chipBefore !== chipAfter, `${chipBefore} → ${chipAfter}`);

// Specular interactivo: el cursor deja posición en las custom properties del nav
const pill = home.locator('.glass-nav-pill');
const pillBox = await pill.boundingBox();
await home.mouse.move(pillBox.x + pillBox.width * 0.3, pillBox.y + pillBox.height * 0.6);
await home.mouse.move(pillBox.x + pillBox.width * 0.7, pillBox.y + pillBox.height * 0.6);
await home.waitForTimeout(200);
const specVals = await pill.evaluate((el) => {
  const s = el.style;
  return { x: s.getPropertyValue('--spec-x'), y: s.getPropertyValue('--spec-y') };
});
check('specular nav → sigue al cursor', specVals.x !== '' && Number.parseFloat(specVals.x) > 50, JSON.stringify(specVals));

// Hover tarjeta: el lift con halo de acento
const card = home.locator('a.card-hover').first();
await card.scrollIntoViewIfNeeded();
const cardBefore = await card.evaluate((el) => getComputedStyle(el).transform);
await card.hover();
await home.waitForTimeout(400);
const cardAfter = await card.evaluate((el) => getComputedStyle(el).transform);
check('hover tarjeta → lift activo', cardBefore !== cardAfter && cardAfter.includes('matrix'), `${cardBefore} → ${cardAfter}`);

// Scrub engine vivo: el parallax del h1 responde al scroll real
await home.evaluate(() => window.scrollTo(0, 0));
await home.waitForTimeout(600);
const heroTitle = home.locator('h1[data-scrub="parallax"]');
const parallaxBefore = await heroTitle.evaluate((el) => el.style.transform);
await home.evaluate(() => window.scrollBy(0, 500));
await home.waitForTimeout(800);
const parallaxAfter = await heroTitle.evaluate((el) => el.style.transform);
check('scrub parallax → transform sigue al scroll real', parallaxBefore !== parallaxAfter, `${parallaxBefore} → ${parallaxAfter}`);

// Pulso ASCII: en el rediseño el glow vive en el halo (.ascii-halo / ascii-glow)
const breathe = await home.locator('.ascii-halo').evaluate((el) => getComputedStyle(el).animationName);
check('ascii respira (glow animado)', breathe === 'ascii-glow', breathe);

await home.close();

// ─── Reduced motion global: nada del sistema escribe/animación ───
const rm = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await rm.emulateMedia({ reducedMotion: 'reduce' });
await rm.goto(BASE + '/', { waitUntil: 'networkidle' });
const rmState = await rm.evaluate(() => ({
  inlineScrub: [...document.querySelectorAll('[data-scrub]')].filter(
    (el) => el.style.transform || el.style.opacity || el.style.clipPath
  ).length,
  orbAnim: getComputedStyle(document.querySelector('.aurora-orb')).animationName,
  sheenAnim: getComputedStyle(document.querySelector('.glass-sheen'), '::after').animationName,
}));
check('reduced-motion → scrub sin estilos inline', rmState.inlineScrub === 0, `con estilos: ${rmState.inlineScrub}`);
check('reduced-motion → orbe parado', rmState.orbAnim === 'none', rmState.orbAnim);
check('reduced-motion → sheen parado', rmState.sheenAnim === 'none', rmState.sheenAnim);
await rm.close();

await browser.close();

const failedChecks = results.filter((r) => !r.pass);
for (const r of results) {
  console.log(`${r.pass ? '✔' : '✖'} ${r.name} → ${JSON.stringify(r.detail)}`);
}
console.log(failedChecks.length === 0 ? 'ALL PASS' : `FAILURES: ${failedChecks.length}`);
process.exit(failedChecks.length === 0 ? 0 : 1);
