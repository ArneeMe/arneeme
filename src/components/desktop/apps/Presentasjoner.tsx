import { useState, useEffect } from 'preact/hooks';
import { closeWindow } from '../../../stores/desktop';
import { isMobile } from '../../../stores/viewport';
import { formaterDato, type Presentasjon } from '../../../presentasjoner/felles';
import { MenuBar } from '../MenuBar';

interface Props {
  instanceId: string;
}

const apne = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

export default function Presentasjoner({ instanceId }: Props) {
  // Lista bygges fra filene ved bygging og hentes her, så HTML-filene ikke
  // havner i JS-bunten.
  const [liste, setListe] = useState<Presentasjon[] | null>(null);
  const [feil, setFeil] = useState(false);
  useEffect(() => {
    fetch('/presentasjoner/liste.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setListe)
      .catch(() => setFeil(true));
  }, []);

  const menus = [
    {
      label: 'File',
      items: [
        { label: 'Åpne oversikt i ny fane', onClick: () => apne('/presentasjoner/') },
        { label: 'Forhåndsvis lokal fil…', onClick: () => apne('/presentasjoner/forhandsvis/') },
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
          {feil && <span>Kunne ikke hente presentasjonene.</span>}
          {liste?.map((p) => {
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
                title={[p.tittel, formaterDato(p.dato), p.beskrivelse].filter(Boolean).join('\n')}
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
          {liste ? `${liste.length} objekt${liste.length !== 1 ? 'er' : ''}` : 'Henter…'}
        </div>
      </div>
    </div>
  );
}
