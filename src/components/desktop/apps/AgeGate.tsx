import { useState, useEffect, useRef } from 'preact/hooks';

interface Props {
  instanceId: string;
}

type GateState = 'checking' | 'idle' | 'starting' | 'qr' | 'verifying' | 'success' | 'error';

export default function AgeGate({ instanceId: _instanceId }: Props) {
  const [state, setState] = useState<GateState>('checking');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [deepLink, setDeepLink] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestIdRef = useRef<string>('');

  useEffect(() => {
    setIsMobile(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));

    fetch('/api/session/check')
      .then((r) => r.json())
      .then(({ verified }: { verified: boolean }) => {
        setState(verified ? 'success' : 'idle');
      })
      .catch(() => setState('idle'));
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function startVerification() {
    setState('starting');
    try {
      const res = await fetch('/api/verify/start', { method: 'POST' });
      if (!res.ok) throw new Error('Kunne ikke starte verifikasjon');
      const data = await res.json() as { requestId: string; qrDataUrl: string; deepLink: string };
      requestIdRef.current = data.requestId;
      setQrDataUrl(data.qrDataUrl);
      setDeepLink(data.deepLink);
      setState('qr');
      beginPolling(data.requestId);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Noe gikk galt');
      setState('error');
    }
  }

  function beginPolling(requestId: string) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/verify/status?requestId=${encodeURIComponent(requestId)}`);
        const data = await res.json() as { status: string; verified?: boolean };

        if (data.status === 'pending') return;

        stopPolling();
        if (data.status === 'verified' && data.verified) {
          setState('success');
        } else if (data.status === 'expired') {
          setErrorMsg('Sesjonen utløp. Prøv igjen.');
          setState('error');
        } else {
          setErrorMsg('Verifikasjon mislyktes. Prøv igjen.');
          setState('error');
        }
      } catch {
        stopPolling();
        setErrorMsg('Nettverksfeil. Prøv igjen.');
        setState('error');
      }
    }, 2000);
  }

  // Clean up polling on unmount
  useEffect(() => () => stopPolling(), []);

  if (state === 'checking') {
    return (
      <div class="age-gate-body age-gate-center">
        <p class="age-gate-muted">Laster…</p>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div class="age-gate-body age-gate-center">
        <div class="age-gate-success-icon">✓</div>
        <h2 class="age-gate-title">Du er over 16.</h2>
        <p class="age-gate-body-text">Velkommen.</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div class="age-gate-body age-gate-center">
        <p class="age-gate-error">{errorMsg || 'Noe gikk galt.'}</p>
        <button class="age-gate-btn" onClick={() => setState('idle')}>
          Prøv igjen
        </button>
      </div>
    );
  }

  if (state === 'qr' || state === 'verifying') {
    return (
      <div class="age-gate-body age-gate-center">
        {state === 'qr' ? (
          <>
            <p class="age-gate-label">Scan med ZKPassport-appen</p>
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="ZKPassport QR-kode"
                class="age-gate-qr"
                width={200}
                height={200}
              />
            )}
            {isMobile && deepLink && (
              <a href={deepLink} class="age-gate-deep-link">
                Åpne ZKPassport-appen
              </a>
            )}
            <p class="age-gate-muted">Venter på bekreftelse…</p>
          </>
        ) : (
          <p class="age-gate-muted">Verifiserer…</p>
        )}
      </div>
    );
  }

  // idle or starting
  return (
    <div class="age-gate-body">
      <div class="age-gate-preview" aria-hidden="true">
        <span>Du er over 16. Velkommen.</span>
      </div>

      <div class="age-gate-overlay">
        <h2 class="age-gate-title">Kun for voksne</h2>
        <p class="age-gate-body-text">
          Bekreft at du er over 16 med passet ditt.
          <br />
          Ingen data lagres.
        </p>
        <button
          class="age-gate-btn"
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
              ZKPassport-tjenesten at passet ditt viser at du er over 16. Beviset
              er matematisk — nettstedet kan ikke avsløre det.
            </p>
            <p>
              <strong>Hva jeg lærer om deg:</strong> At du er over 16. Det er det.
            </p>
            <p>
              <strong>Hva jeg ikke lærer:</strong> Navn, fødselsdato, passnummer,
              nasjonalitet eller om du har vært her før.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
