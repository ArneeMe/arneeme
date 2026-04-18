import type { ComponentChildren } from 'preact';
import {
  closeWindow,
  focusWindow,
  moveWindow,
  resizeWindow,
  toggleMaximize,
  toggleMinimize,
} from '../../stores/desktop';
import { useDraggable } from './hooks/useDraggable';
import { useResizable } from './hooks/useResizable';
import type { WindowInstance } from '../../stores/desktop';
import type { AppDefinition } from '../../apps/types';

interface Props {
  win: WindowInstance;
  app: AppDefinition;
  children: ComponentChildren;
}

export function WindowFrame({ win, app, children }: Props) {
  const { onMouseDown: startDrag } = useDraggable({
    onMove: (x, y) => moveWindow(win.id, { x, y }),
    onFocus: () => focusWindow(win.id),
    disabled: win.maximized,
  });

  const { onMouseDown: startResize } = useResizable({
    onResize: (w, h) => resizeWindow(win.id, { w, h }),
    minSize: app.minSize,
    disabled: win.maximized || app.resizable === false,
  });

  const style = win.maximized
    ? {
        position: 'fixed' as const,
        left: 0,
        top: 0,
        width: '100vw',
        height: 'calc(100vh - 28px)',
        zIndex: win.zIndex,
      }
    : {
        position: 'fixed' as const,
        left: win.position.x,
        top: win.position.y,
        width: win.size.w,
        height: win.size.h,
        zIndex: win.zIndex,
        display: win.minimized ? 'none' : 'flex',
        flexDirection: 'column' as const,
      };

  return (
    <div
      class="window"
      style={style}
      onMouseDown={() => focusWindow(win.id)}
    >
      <div
        class="title-bar"
        onMouseDown={(e) => startDrag(e as MouseEvent, win.position.x, win.position.y)}
        style={{ cursor: win.maximized ? 'default' : 'move', userSelect: 'none' }}
      >
        <div class="title-bar-text">
          <img
            src={win.icon}
            alt=""
            style={{ width: 16, height: 16, marginRight: 4, verticalAlign: 'middle', imageRendering: 'pixelated' }}
          />
          {win.title}
        </div>
        <div class="title-bar-controls">
          <button aria-label="Minimize" onClick={() => toggleMinimize(win.id)} />
          <button aria-label="Maximize" onClick={() => toggleMaximize(win.id)} />
          <button aria-label="Close" onClick={() => closeWindow(win.id)} />
        </div>
      </div>

      <div
        class="window-body"
        style={{ flex: 1, overflow: 'auto', margin: 0, padding: 0 }}
      >
        {children}
      </div>

      {app.resizable !== false && !win.maximized && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 16,
            height: 16,
            cursor: 'se-resize',
          }}
          onMouseDown={(e) => startResize(e as MouseEvent, win.size.w, win.size.h)}
        />
      )}
    </div>
  );
}
