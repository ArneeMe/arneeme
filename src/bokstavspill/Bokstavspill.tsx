import { useState, useEffect, useRef } from 'preact/hooks';
import {
  ANTALL,
  MAKS_KONSONANTER,
  MAKS_VOKALER,
  erVokal,
  finnBeste,
  fyllResten,
  hentOrd,
  kanLages,
  nyeBunker,
} from './bokstavspill';

interface Props {
  instanceId: string;
}

const TID = 30;

export default function Bokstavspill(_props: Props) {
  const bunker = useRef(nyeBunker());
  const [bokstaver, setBokstaver] = useState<string[]>([]);
  const [igjen, setIgjen] = useState<number | null>(null);
  const [svar, setSvar] = useState('');
  const [melding, setMelding] = useState('');
  const [beste, setBeste] = useState<string[] | null>(null);
  const [leter, setLeter] = useState(false);

  useEffect(() => {
    hentOrd();
  }, []);

  useEffect(() => {
    if (igjen === null || igjen <= 0) return;
    const id = setTimeout(() => setIgjen(igjen - 1), 1000);
    return () => clearTimeout(id);
  }, [igjen]);

  const vokaler = bokstaver.filter(erVokal).length;
  const konsonanter = bokstaver.length - vokaler;
  const ferdig = bokstaver.length === ANTALL;

  const settBokstaver = (neste: string[]) => {
    setBokstaver(neste);
    if (neste.length === ANTALL) setIgjen(TID);
  };

  const trekk = (vokal: boolean) => {
    const b = vokal ? bunker.current.vokaler.pop() : bunker.current.konsonanter.pop();
    if (b) settBokstaver([...bokstaver, b]);
  };

  const nyRunde = () => {
    bunker.current = nyeBunker();
    setBokstaver([]);
    setIgjen(null);
    setSvar('');
    setMelding('');
    setBeste(null);
  };

  const sjekk = async () => {
    const ord = svar.trim().toLowerCase();
    if (!ord) return;
    if (!kanLages(ord, bokstaver)) {
      setMelding(`«${ord}» kan ikke lages av bokstavene.`);
      return;
    }
    const liste = await hentOrd();
    if (!liste.has(ord)) {
      setMelding(`«${ord}» står ikke i ordlista.`);
      return;
    }
    const poeng = ord.length === ANTALL ? 18 : ord.length;
    setMelding(`«${ord}» er godkjent. ${poeng} poeng.`);
  };

  const visBeste = async () => {
    setIgjen(0);
    setLeter(true);
    setBeste(finnBeste(await hentOrd(), bokstaver));
    setLeter(false);
  };

  const klokke = igjen === null ? '--' : igjen > 0 ? String(igjen).padStart(2, '0') : 'Tid ute';

  return (
    <div class="bokstav-app">
      <div class="bokstav-trekk">
        <button onClick={() => trekk(true)} disabled={ferdig || vokaler >= MAKS_VOKALER}>
          Vokal
        </button>
        <button onClick={() => trekk(false)} disabled={ferdig || konsonanter >= MAKS_KONSONANTER}>
          Konsonant
        </button>
        <button onClick={() => settBokstaver(fyllResten(bokstaver, bunker.current))} disabled={ferdig}>
          Tilfeldig
        </button>
      </div>

      <div class="bokstav-tavle">
        {Array.from({ length: ANTALL }, (_, i) => (
          <span key={i} class="bokstav-rute">
            {bokstaver[i]?.toUpperCase() ?? ''}
          </span>
        ))}
      </div>

      <span class="bokstav-klokke">{klokke}</span>

      <form
        class="bokstav-svar"
        onSubmit={(e) => {
          e.preventDefault();
          sjekk();
        }}
      >
        <input
          value={svar}
          placeholder="Ditt ord"
          disabled={!ferdig}
          onInput={(e) => setSvar((e.target as HTMLInputElement).value)}
          aria-label="Ditt ord"
        />
        <button type="submit" disabled={!ferdig}>
          Sjekk
        </button>
      </form>

      {melding && <p class="bokstav-melding">{melding}</p>}

      <div class="bokstav-trekk">
        <button class="bokstav-vis" onClick={visBeste} disabled={!ferdig || leter}>
          Vis beste ord
        </button>
        <button onClick={nyRunde}>Ny runde</button>
      </div>

      {leter && <p class="bokstav-melding">Leter …</p>}
      {beste && (
        <ol class="bokstav-beste sunken-panel">
          {beste.length === 0 ? <li>Fant ingen ord.</li> : beste.map((o) => <li key={o}>{o} ({o.length})</li>)}
        </ol>
      )}

      <p class="bokstav-kilde">Ord fra Norsk ordbank, Språkrådet og UiB (CC BY 4.0).</p>
    </div>
  );
}
