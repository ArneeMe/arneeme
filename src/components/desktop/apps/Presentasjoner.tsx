import { closeWindow } from '../../../stores/desktop';
import { isMobile } from '../../../stores/viewport';
import { sortertePresentasjoner, formaterDato } from '../../../presentasjoner/registry';
import { MenuBar } from '../MenuBar';

interface Props {
  instanceId: string;
}

const apne = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

export default function Presentasjoner({ instanceId }: Props) {
  const liste = sortertePresentasjoner();

  const menus = [
    {
      label: 'File',
      items: [
        { label: 'Åpne oversikt i ny fane', onClick: () => apne('/presentasjoner/') },
        { label: 'Close', onClick: () => closeWindow(instanceId) },
      ],
    },
  ];

  return (
    <div class="explorer-app">
      <MenuBar menus={menus} />

      <div class="explorer-addressbar">
        <span class="addressbar-label">Address</span>
        <div class="addressbar-value">C:\Presentasjoner</div>
      </div>

      <div class="explorer-body">
        <div class="explorer-icons">
          {liste.map((p) => {
            const open = () => apne(`/presentasjoner/${p.slug}/`);
            return (
              <div
                key={p.slug}
                class="explorer-icon"
                role="button"
                tabIndex={0}
                onDblClick={open}
                onClick={isMobile.value ? open : undefined}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') open();
                }}
                title={`${p.tittel}\n${formaterDato(p.dato)}\n\n${p.beskrivelse}`}
              >
                <img
                  src="/icons/presentasjon.svg"
                  alt=""
                  style={{ width: 32, height: 32, imageRendering: 'pixelated' }}
                  draggable={false}
                />
                <span>{p.tittel}</span>
              </div>
            );
          })}
        </div>

        <div class="explorer-statusbar">
          {liste.length} objekt{liste.length !== 1 ? 'er' : ''}
        </div>
      </div>
    </div>
  );
}
