import type { AppDefinition } from '../../apps/types';
import { openApp } from '../../stores/desktop';

interface Props {
  app: AppDefinition;
}

export function DesktopIcon({ app }: Props) {
  const launch = () =>
    openApp(app.id, app.title, app.icon, app.defaultSize, app.singleton ?? false);

  return (
    <div
      class="desktop-icon"
      onDblClick={launch}
      title={app.title}
    >
      <img
        src={app.icon}
        alt={app.title}
        style={{ width: 32, height: 32, imageRendering: 'pixelated' }}
        draggable={false}
      />
      <span>{app.title.replace(' - Notepad', '').replace(' - ', '\n')}</span>
    </div>
  );
}
