import { useState, useEffect, useRef } from 'preact/hooks';

type VerifyState = 'idle' | 'starting' | 'qr' | 'success' | 'error';

export default function Verifier() {
  const [state, setState] = useState<VerifyState>('idle');
  const [deepLink, setDeepLink] = useState<string>('');
  const [devDeepLink, setDevDeepLink] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasDevRef = useRef<HTMLCanvasElement>(null);
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
      if (cancelled) return;
      const opts = { width: 160, margin: 1, color: { dark: '#000000', light: '#ffffff' } };
      if (deepLink && canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, deepLink, opts).catch(() => {});
      }
      if (devDeepLink && canvasDevRef.current) {
        QRCode.toCanvas(canvasDevRef.current, devDeepLink, opts).catch(() => {});
      }
    });
    return () => { cancelled = true; };
  }, [state, deepLink, devDeepLink]);

  async function startVerification() {
    setState('starting');
    setErrorMsg('');
    try {
      const { ZKPassport } = await import('@zkpassport/sdk');
      const zkReal = new ZKPassport();
      const zkDev = new ZKPassport();

      const [builderReal, builderDev] = await Promise.all([
        zkReal.request({ name: 'arnee.me', logo: 'https://arnee.me/icons/16plus-32.svg', purpose: 'Age verification (16+)' }),
        zkDev.request({ name: 'arnee.me', logo: 'https://arnee.me/icons/16plus-32.svg', purpose: 'Age verification (16+)', devMode: true }),
      ]);

      const { url: urlReal, requestId: idReal, onResult: onResultReal, onError: onErrorReal, onReject: onRejectReal } = builderReal.gte('age', 16).done();
      const { url: urlDev, requestId: idDev, onResult: onResultDev, onError: onErrorDev, onReject: onRejectDev } = builderDev.gte('age', 16).done();

      cancelRequestRef.current = () => {
        try { zkReal.cancelRequest(idReal); } catch {}
        try { zkDev.cancelRequest(idDev); } catch {}
      };

      const handleVerified = (verified: boolean) => {
        if (verified) {
          setState('success');
        } else {
          setErrorMsg('Bekreftelsen feilet. Prøv igjen.');
          setState('error');
        }
      };

      onResultReal(({ verified }) => handleVerified(verified));
      onResultDev(({ verified }) => handleVerified(verified));

      onErrorReal(() => {});
      onErrorDev(() => {
        setErrorMsg('Noe gikk galt under verifiseringen. Prøv igjen.');
        setState('error');
      });

      onRejectReal(() => {});
      onRejectDev(() => {
        setErrorMsg('Forespørselen ble avslått.');
        setState('error');
      });

      setDeepLink(urlReal);
      setDevDeepLink(urlDev);
      setState('qr');
    } catch {
      setErrorMsg('Kunne ikke starte ZKPassport. Prøv igjen.');
      setState('error');
    }
  }

  function reset() {
    cancelRequestRef.current?.();
    cancelRequestRef.current = null;
    setDeepLink('');
    setDevDeepLink('');
    setErrorMsg('');
    setState('idle');
  }

  return (
    <div class="window zkp-window">
      <div class="title-bar">
        <div class="title-bar-text">16+ Verifisering</div>
      </div>
      <div class="window-body">{renderBody()}</div>
    </div>
  );

  function renderBody() {
    if (state === 'success') {
      return (
        <div class="age-gate-center">
          <div class="age-gate-success-icon">✓</div>
          <h2 class="age-gate-title">Verifisert · over 16</h2>
          <p class="age-gate-text">
            Et zero-knowledge-bevis ble kontrollert.
            <br />
            Ingenting annet ble lært om deg.
          </p>
          <button class="explorer-btn" onClick={reset}>
            Verifiser på nytt
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
          <div class="age-gate-qr-row">
            <div class="age-gate-qr-col">
              <canvas ref={canvasRef} class="age-gate-qr" width={160} height={160} />
              <p class="age-gate-muted">Ekte pass</p>
              {isMobile && deepLink && (
                <a href={deepLink} class="about-link">Åpne app</a>
              )}
            </div>
            <div class="age-gate-qr-col">
              <canvas ref={canvasDevRef} class="age-gate-qr" width={160} height={160} />
              <p class="age-gate-muted">Dev / test</p>
              {isMobile && devDeepLink && (
                <a href={devDeepLink} class="about-link">Åpne app (dev)</a>
              )}
            </div>
          </div>
          <p class="age-gate-muted">Venter på bekreftelse…</p>
          <button class="explorer-btn" onClick={reset}>
            Avbryt
          </button>
        </div>
      );
    }

    // idle or starting
    return (
      <div class="age-gate-center">
        <h2 class="age-gate-title">ZKPassport-demo</h2>
        <p class="age-gate-text">
          Bevis at du er over 16 med passet ditt — uten å avsløre
          <br />
          hvem du er. Et zero-knowledge-bevis, gjort synlig.
        </p>
        <button
          class="explorer-btn"
          onClick={startVerification}
          disabled={state === 'starting'}
        >
          {state === 'starting' ? 'Starter…' : 'Verifiser alder'}
        </button>
        <details class="age-gate-details">
          <summary>Hvordan fungerer dette?</summary>
          <div class="age-gate-explainer">
            <p>
              <strong>App å installere:</strong> "ZKPassport" — App Store
              eller Google Play. Appen leser NFC-brikken i passet ditt.
            </p>
            <p>
              <strong>Hva som skjer:</strong> Telefonen din lager et
              matematisk bevis på at passet ditt sier at du er over 16.
              Bare beviset sendes — aldri passdataene.
            </p>
            <p>
              <strong>Hva dette nettstedet lærer:</strong> At du er over 16.
              Det er det.
            </p>
            <p>
              <strong>Hva det ikke lærer:</strong> Navn, fødselsdato,
              passnummer, nasjonalitet eller om du har vært her før.
            </p>
            <p>
              <strong>To QR-koder?</strong> Den til venstre er for et ekte
              pass. Den til høyre er dev/test-modus — nyttig hvis du ikke
              har et pass for hånden.
            </p>
          </div>
        </details>
      </div>
    );
  }
}
