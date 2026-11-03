// Verificación visual e2e mínima del portafolio (estado real del navegador).
import { chromium } from '@playwright/test';

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
};

const BASE = process.env.BASE_URL || 'http://localhost:4321';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(BASE, { waitUntil: 'networkidle' });

// 1. El stylesheet principal cargó (excluye el ascii scoped)
const stylesheets = await page.evaluate(() =>
  [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href)
);
check('stylesheets cargados', stylesheets.length > 0, stylesheets);

const totalCssRules = await page.evaluate(() =>
  [...document.styleSheets].reduce((n, s) => n + s.cssRules.length, 0)
);
check('CSS tiene reglas de Tailwind', totalCssRules > 50, `reglas: ${totalCssRules}`);

// 2. Fondo del body pintado con el tema oscuro
const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
check('fondo del body = tema oscuro', bodyBg === 'rgb(10, 14, 26)', bodyBg);

// 3. Nav líquida flotante: píldora de vidrio con blur y borde cápsula
const navGlass = await page.evaluate(() => {
  const pill = document.querySelector('.glass-nav-pill');
  const s = getComputedStyle(pill);
  return { backdrop: s.backdropFilter || s.webkitBackdropFilter, radius: s.borderRadius, blurPx: s.boxShadow };
});
check('nav pill con backdrop-filter', (navGlass.backdrop || '').includes('blur'), navGlass.backdrop);
check('nav pill forma cápsula', navGlass.radius === '9999px', navGlass.radius);
check('nav pill con rim light', (navGlass.blurPx || '').includes('inset'), 'sombra interna presente');

// 4. Tipografía aplicada (Space Grotesk en el h1)
const h1Font = await page.evaluate(() => getComputedStyle(document.querySelector('h1')).fontFamily);
check('h1 usa Space Grotesk', h1Font.toLowerCase().includes('space grotesk'), h1Font);

// 5. Botones chip
const chipCount = await page.locator('a.glass-chip').count();
check('3 chips de vidrio en hero', chipCount === 3, `encontrados: ${chipCount}`);

// 6. Capas parallax: el hero registra 3 y el sistema completo anexa una por sección
const scrubCount = await page.locator('[data-scrub="parallax"]').count();
check('capas parallax (>= 3 del hero)', scrubCount >= 3, `encontradas: ${scrubCount}`);

// 7. Orbes aurora líquidos del hero + CTA glass prominente
const orbCount = await page.locator('.aurora-orb').count();
check('orbes aurora en hero', orbCount === 2, `encontrados: ${orbCount}`);

const ctaGlassCount = await page.locator('a.cta-glass').count();
check('CTA glassProminent en home', ctaGlassCount >= 1, `encontrados: ${ctaGlassCount}`);

// 8. Capturas para inspección visual
await page.screenshot({ path: '/tmp/opencode/hero-top.png' });
await page.screenshot({ path: '/tmp/opencode/hero-full.png', fullPage: true });

// 9. Reduced motion: el motor scrub no debe escribir estilos inline
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.reload({ waitUntil: 'networkidle' });
const inlineScrubStyles = await page.evaluate(() =>
  [...document.querySelectorAll('[data-scrub]')].filter(
    (el) => el.style.transform || el.style.opacity || el.style.clipPath
  ).length
);
check('reduced-motion: sin estilos inline del scrub', inlineScrubStyles === 0, `con estilos: ${inlineScrubStyles}`);
await page.emulateMedia({ reducedMotion: null });

// 10. Red: ninguna petición de CSS falló
const failed = [];
page.on('requestfailed', (r) => failed.push(r.url()));
await page.reload({ waitUntil: 'networkidle' });
check('sin requests fallidos', failed.length === 0, failed);

const failedChecks = results.filter((r) => !r.pass);
for (const r of results) {
  console.log(`${r.pass ? '✔' : '✖'} ${r.name} → ${JSON.stringify(r.detail)}`);
}
console.log(failedChecks.length === 0 ? 'ALL PASS' : `FAILURES: ${failedChecks.length}`);
await browser.close();
process.exit(failedChecks.length === 0 ? 0 : 1);
