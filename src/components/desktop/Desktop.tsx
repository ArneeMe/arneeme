import { desktopState, openApp } from '../../stores/desktop';
import { bootPhase } from '../../stores/boot';
import { apps } from '../../apps/registry';
import { shortcuts } from '../../apps/shortcuts';
import { WindowFrame } from './WindowFrame';
import { DesktopIcon } from './DesktopIcon';
import { Taskbar } from './Taskbar';
import { BootScreen } from './BootScreen';
import { useEffect } from 'preact/hooks';

export function Desktop() {
  const state = desktopState.value;
  const phase = bootPhase.value;

  useEffect(() => {
    if (phase === 'desktop' && state.windows.length === 0) {
      const app = apps['about-me'];
      if (app) {
        openApp(app.id, app.title, app.icon, app.defaultSize, app.singleton ?? false);
      }
    }
  }, [phase]);

  const desktopApps = Object.values(apps).filter((a) => a.showOnDesktop);
  const desktopShortcuts = Object.values(shortcuts).filter((s) => s.showOnDesktop);

  return (
    <>
      <div class="win95-desktop">
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
      </div>

      {phase !== 'desktop' && <BootScreen />}
    </>
  );
}
