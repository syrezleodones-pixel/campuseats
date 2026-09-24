/**
 * True when the user asked the OS for less motion (Settings > Accessibility).
 * Ionic only honours this in a couple of components, so we check it ourselves.
 */
export const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
