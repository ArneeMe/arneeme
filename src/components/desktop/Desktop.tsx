import { desktopState, openApp, clampAllWindows, pruneWindows } from '../../stores/desktop';
import { playSound } from '../../lib/sounds';
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

// Persisterte vinduer kan referere til apper som er fjernet fra registeret
// siden forrige besøk – rydd dem bort før første render.
pruneWindows(Object.keys(apps));

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
    playSound('click');
    setCtxMenu({
      x: Math.min(e.clientX, window.innerWidth - 180),
      y: Math.min(e.clientY, window.innerHeight - 190),
    });
  };

  // Alltid registrert, ikke per meny-åpning: en effekt som registreres først
  // etter render kan tape kappløpet mot et Esc-trykk rett etter åpning.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCtxMenu(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
              role="button"
              tabIndex={0}
              onDblClick={() => window.open(sc.url, '_blank', 'noopener,noreferrer')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  window.open(sc.url, '_blank', 'noopener,noreferrer');
                }
              }}
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
              style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
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
