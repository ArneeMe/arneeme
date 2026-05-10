import { useState, useEffect, useRef } from 'preact/hooks';
import { MenuBar } from '../MenuBar';
import { closeWindow } from '../../../stores/desktop';

interface Props {
  instanceId: string;
}

type GateState = 'checking' | 'idle' | 'starting' | 'qr' | 'success' | 'error';

const STORAGE_KEY = 'arneeme:age_verified:v1';
const TTL_MS = 24 * 60 * 60 * 1000;

interface StoredVerification {
  unlockedAt: number;
}

function readStoredVerification(): StoredVerification | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredVerification;
    if (typeof parsed?.unlockedAt !== 'number') return null;
    if (Date.now() - parsed.unlockedAt > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredVerification() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ unlockedAt: Date.now() }));
}

export default function AgeGate({ instanceId }: Props) {
  const [state, setState] = useState<GateState>('checking');
  const [deepLink, setDeepLink] = useState<string>('');
  const [devDeepLink, setDevDeepLink] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasDevRef = useRef<HTMLCanvasElement>(null);
  const cancelRequestRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setIsMobile(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
    setState(readStoredVerification() ? 'success' : 'idle');
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
        zkReal.request({ name: 'arnee.me', logo: 'https://arnee.me/profile.png', purpose: 'Age verification (16+)' }),
        zkDev.request({ name: 'arnee.me', logo: 'https://arnee.me/profile.png', purpose: 'Age verification (16+)', devMode: true }),
      ]);

      const { url: urlReal, requestId: idReal, onResult: onResultReal, onError: onErrorReal, onReject: onRejectReal } = builderReal.gte('age', 16).done();
      const { url: urlDev, requestId: idDev, onResult: onResultDev, onError: onErrorDev, onReject: onRejectDev } = builderDev.gte('age', 16).done();

      cancelRequestRef.current = () => {
        try { zkReal.cancelRequest(idReal); } catch {}
        try { zkDev.cancelRequest(idDev); } catch {}
      };

      const handleVerified = (verified: boolean) => {
        if (verified) {
          writeStoredVerification();
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

  function resetVerification() {
    localStorage.removeItem(STORAGE_KEY);
    setState('idle');
  }

  function showAbout() {
    alert(
      '16+ Aldersbekreftelse — powered by ZKPassport\n' +
      '─────────────────────────────────────\n\n' +
      'App å installere:\n' +
      '"ZKPassport" — App Store eller Google Play.\n\n' +
      'Slik fungerer det:\n' +
      'Appen leser NFC-brikken i passet ditt og lager\n' +
      'et matematisk bevis (zero-knowledge proof) på at\n' +
      'du er over 16. Kun beviset sendes — ikke passdataene.\n\n' +
      'Hva dette nettstedet lærer:\n' +
      '  ✓ At du er over 16\n\n' +
      'Hva dette nettstedet IKKE lærer:\n' +
      '  ✗ Navn eller fødselsdato\n' +
      '  ✗ Passnummer eller nasjonalitet\n' +
      '  ✗ Om du har vært her før\n\n' +
      'Ingen data lagres på server.\n' +
      'Bekreftelsen er gyldig i 24 timer.'
    );
  }

  const menus = [
    {
      label: 'File',
      items: [
        { label: 'Reset verification', onClick: resetVerification },
        { label: 'Exit', onClick: () => closeWindow(instanceId) },
      ],
    },
    {
      label: 'Help',
      items: [{ label: 'About 16+...', onClick: showAbout }],
    },
  ];

  return (
    <div class="age-gate-app">
      <MenuBar menus={menus} />
      <div class="age-gate-body">{renderBody()}</div>
    </div>
  );

  function renderBody() {
    if (state === 'checking') {
      return (
        <div class="age-gate-center">
          <p class="age-gate-muted">Laster…</p>
        </div>
      );
    }

    if (state === 'success') {
      return (
        <div class="age-gate-center">
          <div class="age-gate-success-icon">✓</div>
          <h2 class="age-gate-title">Du er over 16.</h2>
          <p class="age-gate-text">Velkommen.</p>
          <button class="explorer-btn age-gate-reset-btn" onClick={resetVerification}>
            Tilbakestill
          </button>
        </div>
      );
    }

    if (state === 'error') {
      return (
        <div class="age-gate-center">
          <p class="age-gate-error">{errorMsg || 'Noe gikk galt.'}</p>
          <button class="explorer-btn" onClick={() => setState('idle')}>
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
        </div>
      );
    }

    // idle or starting
    return (
      <>
        <div class="age-gate-preview" aria-hidden="true">
          <span>Du er over 16. Velkommen.</span>
        </div>
        <div class="age-gate-overlay">
          <h2 class="age-gate-title">Kun for voksne</h2>
          <p class="age-gate-text">
            Bekreft at du er over 16 med passet ditt.
            <br />
            Ingen data lagres.
          </p>
          <button
            class="explorer-btn"
            onClick={startVerification}
            disabled={state === 'starting'}
          >
            {state === 'starting' ? 'Starter…' : 'Bekreft alder'}
          </button>
          <details class="age-gate-details">
            <summary>Hvordan fungerer dette?</summary>
            <div class="age-gate-explainer">
              <p>
                <strong>Hva som skjer:</strong> Appen din beviser overfor
                ZKPassport-tjenesten at passet ditt viser at du er over 16.
                Beviset er matematisk — nettstedet kan ikke avsløre det.
              </p>
              <p>
                <strong>Hva jeg lærer om deg:</strong> At du er over 16. Det er det.
              </p>
              <p>
                <strong>Hva jeg ikke lærer:</strong> Navn, fødselsdato,
                passnummer, nasjonalitet eller om du har vært her før.
              </p>
            </div>
          </details>
        </div>
      </>
    );
  }
}
