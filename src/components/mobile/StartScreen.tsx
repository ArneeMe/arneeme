import { apps } from '../../apps/registry';
import { shortcuts } from '../../apps/shortcuts';
import { MobileTile } from './MobileTile';

interface Props {
  onOpenApp: (appId: string) => void;
}

const DEFAULT_TILE_COLOR = '#404040';

/** "Om meg - Notepad" → "Om meg" for a cleaner tile label. */
const tileLabel = (title: string) => title.split(' - ')[0];

export function StartScreen({ onOpenApp }: Props) {
  const mobileApps = Object.values(apps).filter((a) => a.showOnMobile);
  const mobileShortcuts = Object.values(shortcuts);

  return (
    <div class="metro-start">
      <header class="metro-start-header">
        <span class="metro-start-name">arne</span>
        <span class="metro-start-name metro-start-name-dim">natskår</span>
      </header>

      <div class="metro-tilegrid">
        {mobileApps.map((app) => (
          <MobileTile
            key={app.id}
            color={app.tileColor ?? DEFAULT_TILE_COLOR}
            icon={app.icon}
            label={tileLabel(app.title)}
            wide={app.tileWide}
            onClick={() => onOpenApp(app.id)}
          />
        ))}
        {mobileShortcuts.map((sc) => (
          <MobileTile
            key={sc.id}
            color={sc.tileColor ?? DEFAULT_TILE_COLOR}
            icon={sc.icon}
            label={sc.title}
            onClick={() => window.open(sc.url, '_blank', 'noopener,noreferrer')}
          />
        ))}
      </div>
    </div>
  );
}
