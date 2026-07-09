import { useEffect, useRef } from 'preact/hooks';
import { apps } from '../../apps/registry';
import { shortcuts } from '../../apps/shortcuts';
import { openApp } from '../../stores/desktop';
import { logOff } from '../../stores/boot';

interface Props {
  onClose: () => void;
}

export function StartMenu({ onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Piltast-navigasjon mellom menyelementene; Enter aktiverer (native knapp).
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const items = () =>
      Array.from(el.querySelectorAll<HTMLButtonElement>('.start-menu-item'));
    items()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const list = items();
      if (list.length === 0) return;
      const idx = list.indexOf(document.activeElement as HTMLButtonElement);
      const next =
        e.key === 'ArrowDown'
          ? (idx + 1) % list.length
          : (idx - 1 + list.length) % list.length;
      list[next]?.focus();
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, []);

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
    <div class="start-menu" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <div class="start-menu-sidebar">
        <span>arnee.me 95</span>
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
