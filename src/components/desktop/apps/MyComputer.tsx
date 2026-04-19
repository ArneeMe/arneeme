import { useState } from 'preact/hooks';
import { openApp } from '../../../stores/desktop';
import { apps } from '../../../apps/registry';
import { shortcuts } from '../../../apps/shortcuts';

interface Props {
  instanceId: string;
}

type Folder = 'root' | 'projects' | 'games' | 'shortcuts';

interface FolderItem {
  id: string;
  label: string;
  icon: string;
  action: () => void;
}

export default function MyComputer({ instanceId: _instanceId }: Props) {
  const [folder, setFolder] = useState<Folder>('root');
  const [history, setHistory] = useState<Folder[]>([]);

  const navigate = (target: Folder) => {
    setHistory((h) => [...h, folder]);
    setFolder(target);
  };

  const goBack = () => {
    const prev = history[history.length - 1];
    if (prev !== undefined) {
      setHistory((h) => h.slice(0, -1));
      setFolder(prev);
    }
  };

  const launch = (appId: string) => {
    const app = apps[appId];
    if (!app) return;
    openApp(app.id, app.title, app.icon, app.defaultSize, app.singleton ?? false);
  };

  const addressPath: Record<Folder, string> = {
    root: 'My Computer',
    projects: 'My Computer > Projects',
    games: 'My Computer > Games',
    shortcuts: 'My Computer > Shortcuts',
  };

  const rootItems: FolderItem[] = [
    { id: 'projects', label: 'Projects', icon: '/icons/folder.svg', action: () => navigate('projects') },
    { id: 'games', label: 'Games', icon: '/icons/gamepad.svg', action: () => navigate('games') },
    { id: 'shortcuts', label: 'Shortcuts', icon: '/icons/globe.svg', action: () => navigate('shortcuts') },
    { id: 'about-me', label: 'About Me', icon: '/icons/notepad.svg', action: () => launch('about-me') },
    { id: 'c-drive', label: 'C:\\', icon: '/icons/drive.svg', action: () => {} },
  ];

  const projectItems: FolderItem[] = [
    { id: 'bysykkel', label: 'Bergen Bysykkel', icon: '/icons/file.svg', action: () => launch('bysykkel') },
    { id: 'kanonspill', label: 'Kanonspill', icon: '/icons/file.svg', action: () => launch('kanonspill') },
    { id: 'hoksrud', label: 'Bård Hoksrud', icon: '/icons/file.svg', action: () => launch('hoksrud') },
    { id: 'velg-tlf', label: 'Velg Telefonnummer', icon: '/icons/file.svg', action: () => launch('velg-tlf') },
  ];

  const gameItems: FolderItem[] = [
    { id: 'kanonspill', label: 'Kanonspill', icon: '/icons/gamepad.svg', action: () => launch('kanonspill') },
    { id: 'hoksrud', label: 'Bård Hoksrud', icon: '/icons/gamepad.svg', action: () => launch('hoksrud') },
  ];

  const shortcutItems: FolderItem[] = Object.values(shortcuts)
    .filter((s) => s.showInShortcutsFolder)
    .map((s) => ({
      id: s.id,
      label: s.title,
      icon: s.icon,
      action: () => window.open(s.url, '_blank', 'noopener,noreferrer'),
    }));

  const items: Record<Folder, FolderItem[]> = {
    root: rootItems,
    projects: projectItems,
    games: gameItems,
    shortcuts: shortcutItems,
  };

  const currentItems = items[folder];

  return (
    <div class="explorer-app">
      <div class="explorer-menubar">
        <button class="menu-item">File</button>
        <button class="menu-item">Edit</button>
        <button class="menu-item">View</button>
        <button class="menu-item">Help</button>
      </div>

      <div class="explorer-toolbar">
        <button
          class="explorer-btn"
          onClick={goBack}
          disabled={history.length === 0}
          title="Back"
        >
          ← Back
        </button>
      </div>

      <div class="explorer-addressbar">
        <span class="addressbar-label">Address</span>
        <div class="addressbar-value">{addressPath[folder]}</div>
      </div>

      <div class="explorer-body">
        <div class="explorer-icons">
          {currentItems.map((item) => (
            <div
              key={item.id}
              class="explorer-icon"
              onDblClick={item.action}
              title={item.label}
            >
              <img
                src={item.icon}
                alt={item.label}
                style={{ width: 32, height: 32, imageRendering: 'pixelated' }}
                draggable={false}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <div class="explorer-statusbar">
          {currentItems.length} object{currentItems.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
