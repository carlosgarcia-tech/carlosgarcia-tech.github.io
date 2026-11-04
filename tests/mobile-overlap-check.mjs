// Repro del bug móvil: ¿los .metric-card tapan los CTAs del hero?
// Mide el overlap cartesiano entre tarjetas y botones a 375px.
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:4321';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200); // reveal animations settle

const data = await page.evaluate(async () => {
  const rect = (el) => el.getBoundingClientRect();
  const hit = [];
  const buttons = [...document.querySelectorAll('a.cta-glass, a.glass-chip')].map(rect);
  const cards = [...document.querySelectorAll('.metric-card')].map(rect);
  const overlap = (a, b) =>
    Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) *
    Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const overlaps = [];
  buttons.forEach((b, i) => cards.forEach((c, j) => {
    const px = overlap(b, c);
    if (px > 0) overlaps.push({ button: i, card: j, px });
  }));
  // ¿el punto central de cada botón es hittable por el botón y no por una card?
  for (const el of [...document.querySelectorAll('a.cta-glass, a.glass-chip')]) {
    el.scrollIntoView({ block: 'center' });
    await new Promise((r) => setTimeout(r, 100));
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + 4);
    hit.push(el.contains(top) || top === el);
  }
  return { overlaps, hittable: hit, buttonsH: buttons.map((b) => Math.round(b.height)) };
});

console.log(JSON.stringify(data, null, 2));
await page.screenshot({ path: '/tmp/opencode/mobile-hero.png', fullPage: false });
await page.screenshot({ path: '/tmp/opencode/mobile-hero-full.png', fullPage: true });
await browser.close();
