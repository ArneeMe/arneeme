import { useCallback, useRef } from 'preact/hooks';

interface DragOptions {
  onMove: (x: number, y: number) => void;
  onFocus?: () => void;
  disabled?: boolean;
}

export function useDraggable({ onMove, onFocus, disabled }: DragOptions) {
  const startPos = useRef<{ mouseX: number; mouseY: number; winX: number; winY: number; winW: number } | null>(null);

  const onMouseDown = useCallback(
    (e: MouseEvent, currentX: number, currentY: number, winW = 400) => {
      if (disabled) return;
      if ((e.target as HTMLElement).closest('button')) return;
      e.preventDefault();
      onFocus?.();
      startPos.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        winX: currentX,
        winY: currentY,
        winW,
      };

      const onMouseMove = (ev: MouseEvent) => {
        if (!startPos.current) return;
        const dx = ev.clientX - startPos.current.mouseX;
        const dy = ev.clientY - startPos.current.mouseY;
        const MIN_VISIBLE = 40;
        const TITLE_BAR_H = 24;
        const TASKBAR_H = 30;
        const maxX = window.innerWidth - MIN_VISIBLE;
        const minX = -(startPos.current.winW - MIN_VISIBLE);
        const maxY = window.innerHeight - TASKBAR_H - TITLE_BAR_H;
        const newX = Math.min(maxX, Math.max(minX, startPos.current.winX + dx));
        const newY = Math.min(maxY, Math.max(0, startPos.current.winY + dy));
        onMove(newX, newY);
      };

      const onMouseUp = () => {
        startPos.current = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [onMove, onFocus, disabled]
  );

  return { onMouseDown };
}
