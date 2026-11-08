import { useState, useEffect } from 'preact/hooks';
import { los, trekk, type Resultat } from '../../../lib/tallspill';

interface Props {
  instanceId: string;
}

const TID = 30;

export default function Tallspill(_props: Props) {
  const [store, setStore] = useState(1);
  const [tall, setTall] = useState<string[]>(['', '', '', '', '', '']);
  const [mal, setMal] = useState('');
  const [igjen, setIgjen] = useState<number | null>(null);
  const [gaar, setGaar] = useState(false);
  const [regner, setRegner] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [feil, setFeil] = useState('');

  useEffect(() => {
    if (!gaar || igjen === null || igjen <= 0) return;
    const id = setTimeout(() => setIgjen(igjen - 1), 1000);
    return () => clearTimeout(id);
  }, [igjen, gaar]);

  const nyttSpill = () => {
    const t = trekk(store);
    setTall(t.tall.map(String));
    setMal(String(t.mal));
    setResultat(null);
    setFeil('');
    setIgjen(TID);
    setGaar(true);
  };

  const losNa = () => {
    const verdier = tall.map((t) => parseInt(t, 10)).filter((t) => t > 0);
    const m = parseInt(mal, 10);
    setResultat(null);
    if (verdier.length === 0 || !(m > 0)) {
      setFeil('Fyll inn tall og mål.');
      return;
    }
    setFeil('');
    setGaar(false);
    setRegner(true);
    setTimeout(() => {
      setResultat(los(verdier, m));
      setRegner(false);
    }, 20);
  };

  const klokke = igjen === null ? '--' : igjen > 0 ? String(igjen).padStart(2, '0') : 'Tid ute';

  let topp = '';
  if (resultat) {
    if (resultat.avstand > 0) topp = `Ingen eksakt. Nærmest er ${resultat.svar[0].verdi}, ${resultat.avstand} unna.`;
    else if (resultat.antall > resultat.svar.length) topp = `${resultat.antall} løsninger. Viser de ${resultat.svar.length} korteste.`;
    else topp = resultat.antall === 1 ? '1 løsning.' : `${resultat.antall} løsninger.`;
  }

  return (
    <div class="tall-app">
      <fieldset class="tall-fieldset">
        <legend>Store tall</legend>
        <div class="tall-store">
          {[0, 1, 2, 3, 4].map((n) => (
            <button key={n} class={n === store ? 'active' : ''} onClick={() => setStore(n)}>
              {n}
            </button>
          ))}
          <button class="tall-trekk" onClick={nyttSpill}>
            Trekk
          </button>
        </div>
      </fieldset>

      <div class="tall-tavle">
        <span class="tall-klokke">{klokke}</span>
        <input
          class="tall-mal"
          inputMode="numeric"
          placeholder="Mål"
          value={mal}
          onInput={(e) => setMal((e.target as HTMLInputElement).value)}
          aria-label="Mål"
        />
      </div>

      <div class="tall-tall">
        {tall.map((t, i) => (
          <input
            key={i}
            inputMode="numeric"
            value={t}
            onInput={(e) => {
              const neste = [...tall];
              neste[i] = (e.target as HTMLInputElement).value;
              setTall(neste);
            }}
            aria-label={`Tall ${i + 1}`}
          />
        ))}
      </div>

      <button class="tall-los" onClick={losNa} disabled={regner}>
        Løs
      </button>

      {feil && <p class="tall-melding">{feil}</p>}
      {regner && <p class="tall-melding">Regner …</p>}
      {resultat && (
        <div class="tall-svar">
          <p class="tall-melding">{topp}</p>
          <ol class="sunken-panel">
            {resultat.svar.map((s, i) => (
              <li key={i}>
                {s.steg.length === 0 ? <div>{s.verdi} er et av tallene</div> : s.steg.map((l, j) => <div key={j}>{l}</div>)}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
