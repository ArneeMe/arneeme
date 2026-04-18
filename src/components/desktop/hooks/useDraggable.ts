import { useCallback, useRef } from 'preact/hooks';

interface DragOptions {
  onMove: (x: number, y: number) => void;
  onFocus?: () => void;
  disabled?: boolean;
}

export function useDraggable({ onMove, onFocus, disabled }: DragOptions) {
  const startPos = useRef<{ mouseX: number; mouseY: number; winX: number; winY: number } | null>(null);

  const onMouseDown = useCallback(
    (e: MouseEvent, currentX: number, currentY: number) => {
      if (disabled) return;
      if ((e.target as HTMLElement).closest('button')) return;
      e.preventDefault();
      onFocus?.();
      startPos.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        winX: currentX,
        winY: currentY,
      };

      const onMouseMove = (ev: MouseEvent) => {
        if (!startPos.current) return;
        const dx = ev.clientX - startPos.current.mouseX;
        const dy = ev.clientY - startPos.current.mouseY;
        const newX = Math.max(0, startPos.current.winX + dx);
        const newY = Math.max(0, startPos.current.winY + dy);
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
