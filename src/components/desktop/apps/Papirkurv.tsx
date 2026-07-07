import { useState } from 'preact/hooks';
import { closeWindow } from '../../../stores/desktop';
import { playSound } from '../../../lib/sounds';
import { MenuBar } from '../MenuBar';

interface Props {
  instanceId: string;
}

interface TrashedFile {
  name: string;
  icon: string;
  size: string;
}

const TRASH: TrashedFile[] = [
  { name: 'gammel_cv_1998.doc', icon: '/icons/document.svg', size: '23 KB' },
  { name: 'regnskap_FINAL_v2_ENDELIG(2).xls', icon: '/icons/document.svg', size: '108 KB' },
  { name: 'browserhistorikk.dat', icon: '/icons/file.svg', size: '4,2 MB' },
  { name: 'Ny mappe (14)', icon: '/icons/folder.svg', size: '—' },
  { name: 'hjemmeside_backup_backup.zip', icon: '/icons/file.svg', size: '1,7 MB' },
  { name: 'viktig_ikke_slett.txt', icon: '/icons/notepad.svg', size: '1 KB' },
  { name: 'dialtone_remix.wav', icon: '/icons/wave.svg', size: '890 KB' },
];

export default function Papirkurv({ instanceId }: Props) {
  const [files, setFiles] = useState<TrashedFile[]>(TRASH);

  const emptyTrash = () => {
    if (files.length === 0) return;
    if (!window.confirm(`Er du sikker på at du vil slette disse ${files.length} elementene permanent?`)) return;
    setFiles([]);
    playSound('ding');
  };

  const menus = [
    {
      label: 'Fil',
      items: [
        { label: 'Tøm papirkurv', onClick: emptyTrash },
        { label: 'Lukk', onClick: () => closeWindow(instanceId) },
      ],
    },
    {
      label: 'Hjelp',
      items: [
        {
          label: 'Om Papirkurv...',
          onClick: () => alert('Papirkurv\n\nAlt du angrer på, samlet på ett sted siden 1995.'),
        },
      ],
    },
  ];

  return (
    <div class="explorer-app">
      <MenuBar menus={menus} />

      <div class="explorer-addressbar">
        <span class="addressbar-label">Adresse</span>
        <div class="addressbar-value">Papirkurv</div>
      </div>

      <div class="explorer-body">
        <div class="explorer-icons">
          {files.length === 0 ? (
            <p class="trash-empty">Papirkurven er tom. Så flink du er.</p>
          ) : (
            files.map((f) => (
              <div
                key={f.name}
                class="explorer-icon"
                title={`${f.name} (${f.size})`}
                onDblClick={() => alert(`Kan ikke åpne '${f.name}'.\nFilen ligger i papirkurven av en grunn.`)}
              >
                <img
                  src={f.icon}
                  alt=""
                  style={{ width: 32, height: 32, imageRendering: 'pixelated' }}
                  draggable={false}
                />
                <span>{f.name}</span>
              </div>
            ))
          )}
        </div>

        <div class="explorer-statusbar">
          {files.length === 0
            ? '0 objekter'
            : `${files.length} objekt${files.length !== 1 ? 'er' : ''} · Tøm via Fil-menyen`}
        </div>
      </div>
    </div>
  );
}
