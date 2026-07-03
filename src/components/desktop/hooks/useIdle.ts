import { useState, useEffect } from 'preact/hooks';

/**
 * Returns true once no user input has occurred for `timeoutMs`. Any input
 * (mouse, keyboard, wheel, touch) flips it back to false — so a component
 * gated on the return value dismisses itself automatically.
 */
export function useIdle(timeoutMs: number, enabled: boolean): boolean {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setIdle(false);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastMove = 0;

    const arm = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), timeoutMs);
    };

    const onActivity = () => {
      setIdle(false);
      arm();
    };

    // mousemove fires continuously; a timestamp throttle keeps it cheap.
    const onMove = () => {
      const now = performance.now();
      if (now - lastMove < 200) return;
      lastMove = now;
      onActivity();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('wheel', onActivity);
    window.addEventListener('touchstart', onActivity);
    arm();

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('wheel', onActivity);
      window.removeEventListener('touchstart', onActivity);
    };
  }, [timeoutMs, enabled]);

  return idle;
}
