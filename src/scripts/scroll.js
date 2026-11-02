// Continuous scroll scrub engine. Elements opt in with data-scrub:
//   data-scrub="parallax" data-speed="0.15" → translate3d drift toward scroll
//   data-scrub="draw"                       → clip-path reveal, top→bottom
//   data-scrub="fade"                       → opacity ramp on approach
// Writes only transform/opacity/clip-path (compositor-friendly).
import { clamp01, progressInViewport, parallaxOffset } from './scroll-utils.js';

const LERP = 0.12;

const items = [];

function collect() {
  items.length = 0;
  document.querySelectorAll('[data-scrub]').forEach((el) => {
    el.style.transform = '';
    el.style.opacity = '';
    el.style.clipPath = '';
    items.push({
      el,
      mode: el.dataset.scrub,
      speed: parseFloat(el.dataset.speed || '0.1'),
      y: 0,
      t: 0,
      drawn: null, // fade: lerped 0..1; draw: lerped drawn fraction; parallax: unused
      topDoc: 0,
      height: 0,
    });
  });
}

function measure() {
  for (const it of items) {
    const r = it.el.getBoundingClientRect();
    it.topDoc = r.top + window.scrollY;
    it.height = r.height;
  }
}

function frame() {
  const vh = window.innerHeight;
  const sy = window.scrollY;
  for (const it of items) {
    const p = progressInViewport({ top: it.topDoc - sy, height: it.height }, vh);
    if (it.mode === 'parallax') {
      const target = parallaxOffset({ top: it.topDoc - sy, height: it.height }, vh, it.speed);
      it.y += (target - it.y) * LERP;
      it.el.style.transform = `translate3d(0, ${it.y.toFixed(2)}px, 0)`;
    } else if (it.mode === 'draw') {
      // fully drawn once the element is ~40% through the viewport
      const target = clamp01((p - 0.05) / 0.4);
      it.drawn = it.drawn === null ? target : it.drawn + (target - it.drawn) * LERP;
      const clip = ((1 - it.drawn) * 100).toFixed(2);
      it.el.style.clipPath = `inset(${clip}% 0 0 0)`;
    } else if (it.mode === 'fade') {
      const target = clamp01((p - 0.05) / 0.3);
      it.drawn = it.drawn === null ? target : it.drawn + (target - it.drawn) * LERP;
      it.el.style.opacity = it.drawn.toFixed(3);
    }
  }
  requestAnimationFrame(frame);
}

function init() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  collect();
  measure();
  frame();
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    collect();
    measure();
  }, 150);
});

document.addEventListener('astro:page-load', init);
init();
