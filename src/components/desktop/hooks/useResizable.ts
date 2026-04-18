import { useCallback, useRef } from 'preact/hooks';

interface ResizeOptions {
  onResize: (w: number, h: number) => void;
  minSize?: { w: number; h: number };
  disabled?: boolean;
}

export function useResizable({ onResize, minSize, disabled }: ResizeOptions) {
  const startRef = useRef<{
    mouseX: number;
    mouseY: number;
    winW: number;
    winH: number;
  } | null>(null);

  const onMouseDown = useCallback(
    (e: MouseEvent, currentW: number, currentH: number) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      startRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        winW: currentW,
        winH: currentH,
      };

      const onMouseMove = (ev: MouseEvent) => {
        if (!startRef.current) return;
        const dx = ev.clientX - startRef.current.mouseX;
        const dy = ev.clientY - startRef.current.mouseY;
        const newW = Math.max(minSize?.w ?? 200, startRef.current.winW + dx);
        const newH = Math.max(minSize?.h ?? 150, startRef.current.winH + dy);
        onResize(newW, newH);
      };

      const onMouseUp = () => {
        startRef.current = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [onResize, minSize, disabled]
  );

  return { onMouseDown };
}
