import { desktopState, openApp } from '../../stores/desktop';
import { apps } from '../../apps/registry';
import { WindowFrame } from './WindowFrame';
import { DesktopIcon } from './DesktopIcon';
import { Taskbar } from './Taskbar';
import { useEffect } from 'preact/hooks';

export function Desktop() {
  const state = desktopState.value;

  useEffect(() => {
    // Auto-open About Me on first visit if no saved windows
    if (state.windows.length === 0) {
      const app = apps['about-me'];
      if (app) {
        openApp(app.id, app.title, app.icon, app.defaultSize, app.singleton ?? false);
      }
    }
  }, []);

  const desktopApps = Object.values(apps).filter((a) => a.showOnDesktop);

  return (
    <div class="win95-desktop" onClick={() => {}}>
      {/* Desktop icons */}
      <div class="desktop-icons">
        {desktopApps.map((app) => (
          <DesktopIcon key={app.id} app={app} />
        ))}
      </div>

      {/* Windows */}
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

      {/* Taskbar */}
      <Taskbar />
    </div>
  );
}
