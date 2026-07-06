import { useEffect, useRef } from 'preact/hooks';
import { previewScreensaver } from '../../stores/display';

interface Star {
  x: number;
  y: number;
  z: number;
}

const STAR_COUNT = 250;

/**
 * Fullscreen starfield. Idle-triggered mounts unmount by themselves when
 * useIdle sees input; preview mounts are dismissed here by clearing the
 * previewScreensaver signal (with a short grace period so the click that
 * opened the preview doesn't immediately close it).
 */
export function Screensaver() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      z: Math.random(),
    }));

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    const frame = () => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';

      for (const s of stars) {
        s.z -= 0.004;
        if (s.z <= 0.01) {
          s.x = Math.random() * 2 - 1;
          s.y = Math.random() * 2 - 1;
          s.z = 1;
        }
        const sx = cx + (s.x / s.z) * cx;
        const sy = cy + (s.y / s.z) * cy;
        if (sx < 0 || sx >= canvas.width || sy < 0 || sy >= canvas.height) {
          s.x = Math.random() * 2 - 1;
          s.y = Math.random() * 2 - 1;
          s.z = 1;
          continue;
        }
        const size = (1 - s.z) * 2.5;
        ctx.globalAlpha = Math.min(1, 1.2 - s.z);
        ctx.fillRect(sx, sy, size, size);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    const mountedAt = performance.now();
    const dismiss = () => {
      if (performance.now() - mountedAt < 500) return;
      previewScreensaver.value = false;
    };
    window.addEventListener('pointerdown', dismiss);
    window.addEventListener('keydown', dismiss);
    window.addEventListener('mousemove', dismiss);
    return () => {
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('keydown', dismiss);
      window.removeEventListener('mousemove', dismiss);
    };
  }, []);

  return (
    <div class="screensaver-overlay">
      <canvas ref={canvasRef} />
    </div>
  );
}
