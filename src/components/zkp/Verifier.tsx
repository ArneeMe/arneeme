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
          setState('success');
        } else {
          setErrorMsg('Verification failed. Try again.');
          setState('error');
        }
      };

      onResultReal(({ verified }) => handleVerified(verified));
      onResultDev(({ verified }) => handleVerified(verified));

      onErrorReal(() => {});
      onErrorDev(() => {
        setErrorMsg('Something went wrong during verification. Try again.');
        setState('error');
      });

      onRejectReal(() => {});
      onRejectDev(() => {
        setErrorMsg('The request was rejected.');
        setState('error');
      });

      setDeepLink(urlReal);
      setDevDeepLink(urlDev);
      setState('qr');
    } catch {
      setErrorMsg('Could not start ZKPassport. Try again.');
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
        <div class="title-bar-text">16+ Verification</div>
      </div>
      <div class="window-body">{renderBody()}</div>
    </div>
  );

  function renderBody() {
    if (state === 'success') {
      return (
        <div class="age-gate-center">
          <div class="age-gate-success-icon">✓</div>
          <h2 class="age-gate-title">Verified · over 16</h2>
          <p class="age-gate-text">
            A zero-knowledge proof was checked.
            <br />
            Nothing else was learned about you.
          </p>
          <button class="explorer-btn" onClick={reset}>
            Verify again
          </button>
        </div>
      );
    }

    if (state === 'error') {
      return (
        <div class="age-gate-center">
          <p class="age-gate-error">{errorMsg || 'Something went wrong.'}</p>
          <button class="explorer-btn" onClick={reset}>
            Try again
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
              <p class="age-gate-muted">Real passport</p>
              {isMobile && deepLink && (
                <a href={deepLink} class="about-link">Open app</a>
              )}
            </div>
            <div class="age-gate-qr-col">
              <canvas ref={canvasDevRef} class="age-gate-qr" width={160} height={160} />
              <p class="age-gate-muted">Dev / test</p>
              {isMobile && devDeepLink && (
                <a href={devDeepLink} class="about-link">Open app (dev)</a>
              )}
            </div>
          </div>
          <p class="age-gate-muted">Waiting for confirmation…</p>
          <button class="explorer-btn" onClick={reset}>
            Cancel
          </button>
        </div>
      );
    }

    // idle or starting
    return (
      <div class="age-gate-center">
        <h2 class="age-gate-title">ZKPassport demo</h2>
        <p class="age-gate-text">
          Prove you're over 16 with your passport — without revealing
          <br />
          who you are. A zero-knowledge proof, made visible.
        </p>
        <button
          class="explorer-btn"
          onClick={startVerification}
          disabled={state === 'starting'}
        >
          {state === 'starting' ? 'Starting…' : 'Verify age'}
        </button>
        <details class="age-gate-details">
          <summary>How does this work?</summary>
          <div class="age-gate-explainer">
            <p>
              <strong>App to install:</strong> "ZKPassport" — App Store or
              Google Play. The app reads your passport's NFC chip.
            </p>
            <p>
              <strong>What happens:</strong> Your phone produces a mathematical
              proof that your passport says you're over 16. Only the proof is
              sent — never the passport data.
            </p>
            <p>
              <strong>What this site learns:</strong> That you're over 16. That's it.
            </p>
            <p>
              <strong>What it doesn't learn:</strong> Name, date of birth,
              passport number, nationality, or whether you've been here before.
            </p>
            <p>
              <strong>Two QR codes?</strong> The left one is for a real
              passport. The right one is the dev/test mode — useful if you
              don't have one handy.
            </p>
          </div>
        </details>
      </div>
    );
  }
}
