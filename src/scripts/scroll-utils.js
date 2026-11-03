// Pure scrub math for the scroll engine (testable without a browser).

export function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

// 0 when the element's top edge enters at the viewport bottom,
// 1 when its bottom edge leaves at the viewport top; centred ≈ 0.5.
export function progressInViewport(rect, viewportH) {
  return clamp01((viewportH - rect.top) / (viewportH + rect.height));
}

// Elements drift slightly toward the scroll direction (hint toward the
// outcome): negative when the element sits below the viewport centre.
export function parallaxOffset(rect, viewportH, speed) {
  return (viewportH / 2 - (rect.top + rect.height / 2)) * speed;
}
