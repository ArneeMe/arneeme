import { desktopState, openApp, clampAllWindows } from '../../stores/desktop';
import { bootPhase } from '../../stores/boot';
import { isMobile } from '../../stores/viewport';
import { displaySettings, previewScreensaver, PATTERN_CSS } from '../../stores/display';
import { apps } from '../../apps/registry';
import { shortcuts } from '../../apps/shortcuts';
import { WindowFrame } from './WindowFrame';
import { DesktopIcon } from './DesktopIcon';
import { Taskbar } from './Taskbar';
import { BootScreen } from './BootScreen';
import { Screensaver } from './Screensaver';
import { MobileShell } from '../mobile/MobileShell';
import { useIdle } from './hooks/useIdle';
import { useEffect, useState } from 'preact/hooks';

export function Desktop() {
  // Branch before any desktop hooks run, so the window/taskbar/boot machinery
  // never mounts on phones. Each subtree keeps its own stable hook order.
  if (isMobile.value) return <MobileShell />;
  return <DesktopShell />;
}

function DesktopShell() {
  const state = desktopState.value;
  const phase = bootPhase.value;
  const display = displaySettings.value;
  const pattern = PATTERN_CSS[display.pattern];
  const idle = useIdle(
    display.screensaver.timeoutMin * 60_000,
    display.screensaver.enabled && phase === 'desktop',
  );

  useEffect(() => {
    if (phase === 'desktop' && state.windows.length === 0) {
      const app = apps['about-me'];
      if (app) {
        openApp(app.id, app.title, app.icon, app.defaultSize, app.singleton ?? false);
      }
    }
  }, [phase]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => clampAllWindows(), 150);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (t) clearTimeout(t);
    };
  }, []);

  const desktopApps = Object.values(apps).filter((a) => a.showOnDesktop);
  const desktopShortcuts = Object.values(shortcuts).filter((s) => s.showOnDesktop);

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  const onDesktopContextMenu = (e: MouseEvent) => {
    // Bare på selve skrivebordet – vinduer og taskbar beholder sin oppførsel.
    if ((e.target as Element).closest('.window, .taskbar, .start-menu')) return;
    e.preventDefault();
    setCtxMenu({
      x: Math.min(e.clientX, window.innerWidth - 180),
      y: Math.min(e.clientY, window.innerHeight - 190),
    });
  };

  const launchFromCtx = (appId: string) => {
    const app = apps[appId];
    if (app) openApp(app.id, app.title, app.icon, app.defaultSize, app.singleton ?? false);
    setCtxMenu(null);
  };

  return (
    <>
      <div
        class="win95-desktop"
        style={{
          backgroundColor: display.bgColor,
          backgroundImage: pattern.image,
          backgroundSize: pattern.size,
        }}
        onContextMenu={onDesktopContextMenu}
      >
        <div class="desktop-icons">
          {desktopApps.map((app) => (
            <DesktopIcon key={app.id} app={app} />
          ))}
          {desktopShortcuts.map((sc) => (
            <div
              key={sc.id}
              class="desktop-icon"
              onDblClick={() => window.open(sc.url, '_blank', 'noopener,noreferrer')}
              title={sc.title}
            >
              <img
                src={sc.icon}
                alt={sc.title}
                style={{ width: 32, height: 32, imageRendering: 'pixelated' }}
                draggable={false}
              />
              <span>{sc.title}</span>
            </div>
          ))}
        </div>

        {state.windows.map((win) => {
          const app = apps[win.appId];
          if (!app) return null;
          const AppComponent = app.component;
          return (
            <WindowFrame key={win.id} win={win} app={app}>
              <AppComponent instanceId={win.id} {...(app.props ?? {})} />
            </WindowFrame>
          );
        })}

        <Taskbar />

        {ctxMenu && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 9996 }}
              onMouseDown={() => setCtxMenu(null)}
              onContextMenu={(e) => {
                e.preventDefault();
                setCtxMenu(null);
              }}
            />
            <div class="desktop-context-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }}>
              <button onClick={() => window.location.reload()}>Oppdater</button>
              <div class="desktop-context-divider" />
              <button onClick={() => launchFromCtx('notater')}>Nytt notat</button>
              <button onClick={() => launchFromCtx('oppgaver')}>Ny oppgave</button>
              <button onClick={() => launchFromCtx('paint')}>Nytt bilde</button>
              <div class="desktop-context-divider" />
              <button onClick={() => launchFromCtx('skjerm')}>Egenskaper</button>
            </div>
          </>
        )}
      </div>

      {phase !== 'desktop' && <BootScreen />}

      {(idle || previewScreensaver.value) && <Screensaver />}
    </>
  );
}
