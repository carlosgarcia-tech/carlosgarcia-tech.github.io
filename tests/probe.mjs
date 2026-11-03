import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
const probe = await page.evaluate(() => {
  const d = document.createElement('div');
  d.style.backdropFilter = 'blur(20px)';
  document.body.appendChild(d);
  const webkit = document.createElement('div');
  webkit.style.setProperty('-webkit-backdrop-filter', 'blur(20px)');
  document.body.appendChild(webkit);
  const ua = navigator.userAgent;
  return {
    unPrefixed: getComputedStyle(d).backdropFilter,
    webkitPrefixed: getComputedStyle(webkit).webkitBackdropFilter || getComputedStyle(webkit).backdropFilter,
    ua,
  };
});
console.log(JSON.stringify(probe, null, 2));
await browser.close();
