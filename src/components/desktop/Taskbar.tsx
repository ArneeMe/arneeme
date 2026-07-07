import { useState, useEffect } from 'preact/hooks';
import {
  taskbarWindows,
  desktopState,
  toggleMinimize,
  focusWindow,
  cascadeWindows,
  tileWindows,
  minimizeAll,
} from '../../stores/desktop';
import { soundMuted, toggleMuted, playSound } from '../../lib/sounds';
import { StartMenu } from './StartMenu';

export function Taskbar() {
  const [startOpen, setStartOpen] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number } | null>(null);
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);

  // Alltid registrert, ikke per meny-åpning: en effekt som registreres først
  // etter render kan tape kappløpet mot et Esc-trykk rett etter åpning.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setStartOpen(false);
        setCtxMenu(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const windows = taskbarWindows.value;

  const handleWindowBtn = (winId: string) => {
    const state = desktopState.value;
    const win = state.windows.find((w) => w.id === winId);
    if (!win) return;
    if (win.minimized) {
      focusWindow(winId);
      toggleMinimize(winId);
      return;
    }
    const openWins = state.windows.filter((w) => !w.minimized);
    const topZ = Math.max(...openWins.map((w) => w.zIndex));
    if (win.zIndex === topZ) {
      toggleMinimize(winId);
    } else {
      focusWindow(winId);
    }
  };

  const toggleStart = () => {
    setStartOpen((v) => {
      if (!v) playSound('click');
      return !v;
    });
  };

  const onTaskbarContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    playSound('click');
    setStartOpen(false);
    setCtxMenu({ x: Math.min(e.clientX, window.innerWidth - 180) });
  };

  const ctxAction = (fn: () => void) => {
    fn();
    setCtxMenu(null);
  };

  return (
    <>
      {startOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
          onClick={() => setStartOpen(false)}
        />
      )}
      {startOpen && <StartMenu onClose={() => setStartOpen(false)} />}

      {ctxMenu && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
            onMouseDown={() => setCtxMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setCtxMenu(null);
            }}
          />
          <div
            class="desktop-context-menu"
            style={{ left: ctxMenu.x, bottom: 34, top: 'auto' }}
          >
            <button onClick={() => ctxAction(cascadeWindows)}>Overlapp vinduer</button>
            <button onClick={() => ctxAction(tileWindows)}>Still vinduer side om side</button>
            <div class="desktop-context-divider" />
            <button onClick={() => ctxAction(minimizeAll)}>Minimer alle vinduer</button>
          </div>
        </>
      )}

      <div class="taskbar" onContextMenu={onTaskbarContextMenu}>
        <button
          class={`start-button${startOpen ? ' active' : ''}`}
          onClick={toggleStart}
        >
          <img
            src="/icons/start.svg"
            alt=""
            style={{ width: 16, height: 16, imageRendering: 'pixelated' }}
          />
          <strong>Start</strong>
        </button>

        <div class="taskbar-divider" />

        <div class="taskbar-windows">
          {windows.map((win) => (
            <button
              key={win.id}
              class={`taskbar-btn${!win.minimized ? ' active' : ''}`}
              onClick={() => handleWindowBtn(win.id)}
            >
              <img
                src={win.icon}
                alt=""
                style={{ width: 16, height: 16, imageRendering: 'pixelated', marginRight: 4 }}
              />
              {win.title}
            </button>
          ))}
        </div>

        <div class="taskbar-tray">
          <button
            class="tray-sound"
            onClick={toggleMuted}
            title={soundMuted.value ? 'Lyd av – klikk for å slå på' : 'Lyd på – klikk for å dempe'}
            aria-label={soundMuted.value ? 'Slå på lyd' : 'Demp lyd'}
          >
            {soundMuted.value ? '🔇' : '🔊'}
          </button>
          <span class="tray-clock">{time}</span>
        </div>
      </div>
    </>
  );
}
