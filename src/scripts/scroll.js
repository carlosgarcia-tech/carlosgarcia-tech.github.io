// Continuous scroll scrub engine. Elements opt in with data-scrub:
//   data-scrub="parallax" data-speed="0.15" → translate3d drift toward scroll
//   data-scrub="draw"                       → clip-path reveal, top→bottom
//   data-scrub="fade"                       → opacity ramp on approach
// Writes only transform/opacity/clip-path (compositor-friendly).
import { clamp01, progressInViewport, parallaxOffset } from './scroll-utils.js';

const LERP = 0.12;
// Below this per-frame delta an animation is considered settled and stops
// writing styles, so the rAF loop idles at zero paint cost.
const SETTLED_EPSILON = 0.5;
const RESIZE_RECOLLECT_DELAY_MS = 150;

const items = [];
let rafId = null;
let resizeTimer = null;

/**
 * (Re)collect scrub elements. Existing elements keep their lerped animation
 * state so a re-collect (layout change, navigation) never restarts the
 * motion from zero — an interruption must not cause a visible jump.
 */
function collect() {
  const previous = new Map(items.map((it) => [it.el, it]));
  items.length = 0;
  document.querySelectorAll('[data-scrub]').forEach((el) => {
    const firstRun = !previous.has(el);
    if (firstRun) {
      el.style.transform = '';
      el.style.opacity = '';
      el.style.clipPath = '';
    }
    const before = previous.get(el);
    items.push({
      el,
      mode: el.dataset.scrub,
      speed: parseFloat(el.dataset.speed || '0.1'),
      y: before ? before.y : 0,
      drawn: before ? before.drawn : null,
      topDoc: before ? before.topDoc : 0,
      height: before ? before.height : 0,
    });
  });
}

/**
 * Cache each element's document-space position. Must run before the frame
 * loop so per-frame math needs no layout reads.
 */
function measure() {
  for (const it of items) {
    const r = it.el.getBoundingClientRect();
    it.topDoc = r.top + window.scrollY;
    it.height = r.height;
  }
}

/**
 * Advance one scrub item toward its scroll-driven target.
 * Returns false when the item is fully settled and needs no style write.
 *
 * @param {{ el: HTMLElement, mode: string, speed: number, y: number,
 *           drawn: number|null, topDoc: number, height: number }} it
 * @param {number} vh viewport height in px
 * @param {number} sy current window.scrollY in px
 * @returns {boolean} true if a style was written this frame
 */
function scrubTick(it, vh, sy) {
  const rect = { top: it.topDoc - sy, height: it.height };
  if (it.mode === 'parallax') {
    const target = parallaxOffset(rect, vh, it.speed);
    const delta = target - it.y;
    if (Math.abs(delta) < SETTLED_EPSILON) {
      if (it.y !== target) it.el.style.transform = `translate3d(0, ${target.toFixed(2)}px, 0)`;
      it.y = target;
      return false;
    }
    it.y += delta * LERP;
    it.el.style.transform = `translate3d(0, ${it.y.toFixed(2)}px, 0)`;
    return true;
  }

  const p = progressInViewport(rect, vh);
  if (it.mode === 'draw') {
    // fully drawn once the element is ~40% through the viewport
    const target = clamp01((p - 0.05) / 0.4);
    return lerpState(it, target, (drawn) => {
      const clip = ((1 - drawn) * 100).toFixed(2);
      it.el.style.clipPath = `inset(${clip}% 0 0 0)`;
    });
  }
  if (it.mode === 'fade') {
    const target = clamp01((p - 0.05) / 0.3);
    return lerpState(it, target, (drawn) => {
      it.el.style.opacity = drawn.toFixed(3);
    });
  }
  return false;
}

/**
 * Lerp a 0..1 animation state toward its target and invoke the writer.
 * Returns whether the state actually moved this frame.
 */
function lerpState(it, target, write) {
  const from = it.drawn === null ? target : it.drawn;
  const next = from + (target - from) * LERP;
  const moved = Math.abs(target - from) >= SETTLED_EPSILON / 100;
  if (moved) {
    it.drawn = next;
    write(next);
  } else {
    it.drawn = target;
    write(target);
  }
  return moved;
}

/**
 * One animation frame: scrub every registered element and keep the loop
 * alive. Settled items short-circuit without touching the DOM.
 */
function frame() {
  const vh = window.innerHeight;
  const sy = window.scrollY;
  for (const it of items) {
    scrubTick(it, vh, sy);
  }
  rafId = requestAnimationFrame(frame);
}

/**
 * Start (or restart) the scrub engine. Cancels any previous loop so
 * repeated init calls (SPA page loads) never stack parallel rAF loops.
 */
function init() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (rafId !== null) cancelAnimationFrame(rafId);
  collect();
  measure();
  frame();
}

/**
 * Re-measure cached geometry after a resize. Kept light: state and styles
 * are preserved so the layout never jumps mid-animation.
 */
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(measure, RESIZE_RECOLLECT_DELAY_MS);
});

document.addEventListener('astro:page-load', init);
init();
