import { useState, useEffect, useRef } from 'preact/hooks';

type VerifyState = 'idle' | 'starting' | 'qr' | 'success' | 'error';

type Valg = { alder: 0 | 16 | 18; nasjonalitet: boolean; navn: boolean; test: boolean };

type Svar = { linjer: string[]; test: boolean };

export default function Verifier() {
  const [state, setState] = useState<VerifyState>('idle');
  const [valg, setValg] = useState<Valg>({ alder: 16, nasjonalitet: false, navn: false, test: false });
  const [lenke, setLenke] = useState<string>('');
  const [svar, setSvar] = useState<Svar | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [kopiert, setKopiert] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cancelRequestRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setIsMobile(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    return () => {
      cancelRequestRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (state !== 'qr') return;
    let cancelled = false;
    import('qrcode').then(({ default: QRCode }) => {
      if (cancelled || !lenke || !canvasRef.current) return;
      QRCode.toCanvas(canvasRef.current, lenke, { width: 200, margin: 1, color: { dark: '#000000', light: '#ffffff' } }).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [state, lenke]);

  function formål(v: Valg) {
    const deler: string[] = [];
    if (v.alder) deler.push(`over ${v.alder}`);
    if (v.nasjonalitet) deler.push('nasjonalitet');
    if (v.navn) deler.push('navn');
    return `Bekreft ${deler.join(', ')}`;
  }

  function sjekk(v: Valg, navn: string[], result: any): string | string[] {
    const linjer: string[] = [];
    if (v.alder) {
      const gte = result?.age?.gte;
      if (!navn.includes('compare_age') || gte?.expected !== v.alder || gte?.result !== true) {
        return `Mangler gyldig bevis for at du er over ${v.alder}.`;
      }
      linjer.push(`Over ${v.alder}: ja`);
    }
    if (v.nasjonalitet || v.navn) {
      if (!navn.includes('disclose_bytes')) return 'Mangler bevis for dataene som skulle deles.';
    }
    if (v.nasjonalitet) {
      const n = result?.nationality?.disclose?.result;
      if (!n) return 'Mangler nasjonalitet i svaret.';
      linjer.push(`Nasjonalitet: ${n}`);
    }
    if (v.navn) {
      const f = result?.firstname?.disclose?.result;
      const e = result?.lastname?.disclose?.result;
      if (!f || !e) return 'Mangler navn i svaret.';
      linjer.push(`Navn: ${f} ${e}`);
    }
    return linjer;
  }

  async function startVerification() {
    if (!valg.alder && !valg.nasjonalitet && !valg.navn) {
      setErrorMsg('Velg minst én ting å be om.');
      setState('error');
      return;
    }
    setState('starting');
    setErrorMsg('');
    setSvar(null);
    const v = valg;
    try {
      const { ZKPassport } = await import('@zkpassport/sdk');
      const zk = new ZKPassport();
      let builder: any = await zk.request({
        name: 'arnee.me',
        logo: 'https://arnee.me/icons/16plus-32.svg',
        purpose: formål(v),
        devMode: v.test,
      });
      if (v.alder) builder = builder.gte('age', v.alder);
      if (v.nasjonalitet) builder = builder.disclose('nationality');
      if (v.navn) builder = builder.disclose('firstname').disclose('lastname');
      const { url, requestId, onResult, onError, onReject, onProofGenerated } = builder.done();

      const navn: string[] = [];
      onProofGenerated((p: any) => { if (p?.name) navn.push(p.name); });
      cancelRequestRef.current = () => { try { zk.cancelRequest(requestId); } catch {} };

      onResult(({ verified, result }: any) => {
        if (!verified) {
          setErrorMsg('Beviset holdt ikke. Prøv igjen.');
          setState('error');
          return;
        }
        const r = sjekk(v, navn, result);
        if (typeof r === 'string') {
          setErrorMsg(r);
          setState('error');
          return;
        }
        setSvar({ linjer: r, test: v.test });
        setState('success');
      });
      onError(() => {
        setErrorMsg('Noe gikk galt under verifiseringen. Prøv igjen.');
        setState('error');
      });
      onReject(() => {
        setErrorMsg('Forespørselen ble avslått.');
        setState('error');
      });

      setLenke(url);
      setKopiert(false);
      setState('qr');
    } catch {
      setErrorMsg('Kunne ikke starte ZKPassport. Prøv igjen.');
      setState('error');
    }
  }

  function reset() {
    cancelRequestRef.current?.();
    cancelRequestRef.current = null;
    setLenke('');
    setErrorMsg('');
    setSvar(null);
    setState('idle');
  }

  async function kopier() {
    try {
      await navigator.clipboard.writeText(lenke);
      setKopiert(true);
    } catch {}
  }

  const appLenke = lenke.replace('https://zkpassport.id/r?', 'zkpassport:///r?');

  return (
    <div class="window zkp-window">
      <div class="title-bar">
        <div class="title-bar-text">Bevis med pass</div>
      </div>
      <div class="window-body">{renderBody()}</div>
    </div>
  );

  function renderBody() {
    if (state === 'success' && svar) {
      return (
        <div class="age-gate-center">
          <div class="age-gate-success-icon">✓</div>
          <h2 class="age-gate-title">{svar.test ? 'Testpass bekreftet' : 'Bekreftet'}</h2>
          {svar.test && (
            <p class="age-gate-error">Testmodus: dette var et testpass, ikke et ekte pass.</p>
          )}
          <ul class="zkp-liste">
            {svar.linjer.map((l) => <li>{l}</li>)}
          </ul>
          <p class="age-gate-text">
            Et zero-knowledge-bevis ble kontrollert.
            <br />
            Ingenting annet ble lært om deg.
          </p>
          <button class="explorer-btn" onClick={reset}>
            Ny forespørsel
          </button>
        </div>
      );
    }

    if (state === 'error') {
      return (
        <div class="age-gate-center">
          <p class="age-gate-error">{errorMsg || 'Noe gikk galt.'}</p>
          <button class="explorer-btn" onClick={reset}>
            Prøv igjen
          </button>
        </div>
      );
    }

    if (state === 'qr') {
      return (
        <div class="age-gate-center">
          <canvas ref={canvasRef} class="age-gate-qr" width={200} height={200} />
          <p class="age-gate-muted">{valg.test ? 'Testmodus: bare testpass godtas' : 'Ekte pass'}</p>
          <div class="zkp-knapper">
            {isMobile && <a href={appLenke} class="explorer-btn">Åpne i Pass</a>}
            {isMobile && <a href={lenke} class="explorer-btn">Åpne i ZKPassport</a>}
            <button class="explorer-btn" onClick={kopier}>{kopiert ? 'Kopiert' : 'Kopier lenke'}</button>
          </div>
          <p class="age-gate-muted">Venter på svar…</p>
          <button class="explorer-btn" onClick={reset}>
            Avbryt
          </button>
        </div>
      );
    }

    const sett = (endring: Partial<Valg>) => setValg({ ...valg, ...endring });
    return (
      <div class="age-gate-center">
        <h2 class="age-gate-title">Bevis med pass</h2>
        <p class="age-gate-text">
          Velg hva siden skal få vite. Resten av passet
          <br />
          forblir på telefonen din.
        </p>
        <fieldset class="zkp-valg">
          <legend>Be om</legend>
          <div class="field-row">
            <input type="radio" id="alder0" name="alder" checked={valg.alder === 0} onChange={() => sett({ alder: 0 })} />
            <label for="alder0">Ikke alder</label>
          </div>
          <div class="field-row">
            <input type="radio" id="alder16" name="alder" checked={valg.alder === 16} onChange={() => sett({ alder: 16 })} />
            <label for="alder16">Over 16</label>
          </div>
          <div class="field-row">
            <input type="radio" id="alder18" name="alder" checked={valg.alder === 18} onChange={() => sett({ alder: 18 })} />
            <label for="alder18">Over 18</label>
          </div>
          <div class="field-row">
            <input type="checkbox" id="nasjonalitet" checked={valg.nasjonalitet} onChange={() => sett({ nasjonalitet: !valg.nasjonalitet })} />
            <label for="nasjonalitet">Nasjonalitet</label>
          </div>
          <div class="field-row">
            <input type="checkbox" id="navn" checked={valg.navn} onChange={() => sett({ navn: !valg.navn })} />
            <label for="navn">Fornavn og etternavn</label>
          </div>
          <div class="field-row">
            <input type="checkbox" id="test" checked={valg.test} onChange={() => sett({ test: !valg.test })} />
            <label for="test">Testmodus (testpass)</label>
          </div>
        </fieldset>
        <button
          class="explorer-btn"
          onClick={startVerification}
          disabled={state === 'starting'}
        >
          {state === 'starting' ? 'Starter…' : 'Lag forespørsel'}
        </button>
        <details class="age-gate-details">
          <summary>Hvordan fungerer dette?</summary>
          <div class="age-gate-explainer">
            <p>
              <strong>App:</strong> ZKPassport fra App Store eller Google Play,
              eller min egen Pass-app. Appen leser NFC-brikken i passet ditt.
            </p>
            <p>
              <strong>Hva som skjer:</strong> Telefonen lager et matematisk
              bevis for det du deler. Bare beviset sendes, aldri passdataene.
            </p>
            <p>
              <strong>Hva siden lærer:</strong> Bare det du har krysset av for.
              Nasjonalitet og navn vises i klartekst.
            </p>
            <p>
              <strong>Testmodus:</strong> Godtar testpass fra Zero Knowledge
              Republic. Nyttig uten pass for hånden, men beviser ingenting om deg.
            </p>
          </div>
        </details>
      </div>
    );
  }
}
