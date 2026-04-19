import { apps } from '../../apps/registry';
import { shortcuts } from '../../apps/shortcuts';
import { openApp } from '../../stores/desktop';
import { logOff } from '../../stores/boot';

interface Props {
  onClose: () => void;
}

export function StartMenu({ onClose }: Props) {
  const launch = (appId: string) => {
    const app = apps[appId];
    if (!app) return;
    openApp(app.id, app.title, app.icon, app.defaultSize, app.singleton ?? false);
    onClose();
  };

  const openShortcut = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div class="start-menu" onClick={(e) => e.stopPropagation()}>
      <div class="start-menu-sidebar">
        <span>Arne Natskår</span>
      </div>
      <div class="start-menu-items">
        <div class="start-menu-section">
          {Object.values(apps)
            .filter((a) => a.showInStartMenu)
            .map((app) => (
              <button
                key={app.id}
                class="start-menu-item"
                onClick={() => launch(app.id)}
              >
                <img
                  src={app.icon}
                  alt=""
                  style={{ width: 16, height: 16, imageRendering: 'pixelated' }}
                />
                <span>{app.title}</span>
              </button>
            ))}
        </div>
        {Object.values(shortcuts).some((s) => s.showInStartMenu) && (
          <>
            <div class="start-menu-divider" />
            <div class="start-menu-section">
              {Object.values(shortcuts)
                .filter((s) => s.showInStartMenu)
                .map((sc) => (
                  <button
                    key={sc.id}
                    class="start-menu-item"
                    onClick={() => openShortcut(sc.url)}
                  >
                    <img
                      src={sc.icon}
                      alt=""
                      style={{ width: 16, height: 16, imageRendering: 'pixelated' }}
                    />
                    <span>{sc.title} ↗</span>
                  </button>
                ))}
            </div>
          </>
        )}
        <div class="start-menu-divider" />
        <div class="start-menu-section">
          <button
            class="start-menu-item"
            onClick={() => {
              logOff();
              onClose();
            }}
          >
            <img src="/icons/shutdown.svg" alt="" style={{ width: 16, height: 16, imageRendering: 'pixelated' }} />
            <span>Log Off...</span>
          </button>
        </div>
      </div>
    </div>
  );
}
