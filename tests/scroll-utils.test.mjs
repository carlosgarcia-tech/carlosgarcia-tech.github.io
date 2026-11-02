import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp01, progressInViewport, parallaxOffset } from '../src/scripts/scroll-utils.js';

const VIEWPORT = 800;

test('clamp01 clamps to [0, 1]', () => {
  assert.equal(clamp01(-1), 0);
  assert.equal(clamp01(2), 1);
  assert.equal(clamp01(0.5), 0.5);
});

test('progressInViewport: element below viewport is 0', () => {
  // rect sits entirely below the fold
  const rect = { top: VIEWPORT * 1.5, height: 300 };
  assert.equal(progressInViewport(rect, VIEWPORT), 0);
});

test('progressInViewport: element scrolled past is 1', () => {
  // bottom edge is far above the viewport top
  const rect = { top: -800, height: 300 };
  assert.equal(progressInViewport(rect, VIEWPORT), 1);
});

test('progressInViewport: center aligned with viewport center is ~0.5', () => {
  // rect centered in the viewport
  const rect = { top: VIEWPORT / 2 - 150, height: 300 };
  assert.ok(Math.abs(progressInViewport(rect, VIEWPORT) - 0.5) < 0.01);
});

test('parallaxOffset: element below center drifts up', () => {
  // rect center 100px below viewport center, speed 0.2 → -20
  const rect = { top: VIEWPORT / 2 + 100 - 150, height: 300 };
  assert.equal(parallaxOffset(rect, VIEWPORT, 0.2), -20);
});
