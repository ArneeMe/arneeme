import { useState, useEffect } from 'preact/hooks';
import { taskbarWindows, desktopState, toggleMinimize, focusWindow } from '../../stores/desktop';
import { StartMenu } from './StartMenu';

export function Taskbar() {
  const [startOpen, setStartOpen] = useState(false);
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

  return (
    <>
      {startOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
          onClick={() => setStartOpen(false)}
        />
      )}
      {startOpen && <StartMenu onClose={() => setStartOpen(false)} />}

      <div class="taskbar">
        <button
          class={`start-button${startOpen ? ' active' : ''}`}
          onClick={() => setStartOpen((v) => !v)}
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
          <span class="tray-clock">{time}</span>
        </div>
      </div>
    </>
  );
}
