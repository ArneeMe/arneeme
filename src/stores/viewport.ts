import { signal } from '@preact/signals';

const QUERY = '(max-width: 767px)';

function initialMatch(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/**
 * True when the viewport is phone-sized. Initialized eagerly so the Preact
 * island's first paint already knows whether to mount the mobile shell (no
 * flash of the Win95 desktop). Kept in sync on resize / orientation change.
 */
export const isMobile = signal(initialMatch());

if (typeof window !== 'undefined' && window.matchMedia) {
  const mql = window.matchMedia(QUERY);
  const update = () => {
    isMobile.value = mql.matches;
  };
  mql.addEventListener('change', update);
}
