import { useState, useEffect, useRef } from 'preact/hooks';

interface Props {
  instanceId: string;
}

const NUM_DIGITS = 8;

export default function VelgTlf({ instanceId: _instanceId }: Props) {
  const [digits, setDigits] = useState<number[]>(Array(NUM_DIGITS).fill(0));
  const [frozen, setFrozen] = useState<boolean[]>(Array(NUM_DIGITS).fill(false));
  const [spinning, setSpinning] = useState(false);
  const [dialed, setDialed] = useState(false);
  const rafRef = useRef<number | null>(null);
  const speedRef = useRef<number[]>(Array(NUM_DIGITS).fill(0));
  const accRef = useRef<number[]>(Array(NUM_DIGITS).fill(0));

  const formatNumber = (d: number[]) =>
    `${d[0]}${d[1]}${d[2]} ${d[3]}${d[4]} ${d[5]}${d[6]}${d[7]}`;

  const allFrozen = frozen.every(Boolean);

  useEffect(() => {
    if (!spinning) return;

    // Per-column base tick rates — left col fastest (cascading slot feel)
    const baseSpeeds = [0.7, 0.55, 0.43, 0.34, 0.27, 0.21, 0.16, 0.12];

    const tick = () => {
      accRef.current = accRef.current.map((acc, i) => {
        if (frozen[i]) return 0;
        return acc + baseSpeeds[i];
      });

      setDigits((prev) =>
        prev.map((d, i) => {
          if (frozen[i]) return d;
          if (accRef.current[i] >= 1) {
            accRef.current[i] -= 1;
            return (d + 1) % 10;
          }
          return d;
        })
      );

      if (!frozen.every(Boolean)) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setSpinning(false);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [spinning, frozen]);

  const spinAll = () => {
    setFrozen(Array(NUM_DIGITS).fill(false));
    accRef.current = Array(NUM_DIGITS).fill(0);
    setDialed(false);
    setSpinning(true);
  };

  const stopAll = () => {
    setFrozen(Array(NUM_DIGITS).fill(true));
    setSpinning(false);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  };

  const reset = () => {
    stopAll();
    setDigits(Array(NUM_DIGITS).fill(0));
    setFrozen(Array(NUM_DIGITS).fill(false));
    setDialed(false);
  };

  const toggleFreeze = (i: number) => {
    setFrozen((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  const dial = () => {
    if (!allFrozen) return;
    setDialed(true);
    const num = formatNumber(digits);
    setTimeout(() => alert(`📞 Kobler til ${num}...\n\nDin samtale kobles nå!`), 50);
  };

  return (
    <div class="velg-tlf-app">
      <div class="velg-tlf-title">Velg ditt telefonnummer</div>
      <div class="velg-tlf-subtitle">Klikk på en kolonne for å fryse den</div>

      <div class="velg-tlf-reels">
        {digits.map((d, i) => (
          <div
            key={i}
            class={`velg-tlf-reel${frozen[i] ? ' frozen' : ''}`}
            onClick={() => spinning && toggleFreeze(i)}
            title={frozen[i] ? 'Frossen' : 'Klikk for å fryse'}
          >
            <div class="velg-tlf-digit">{d}</div>
            <button
              class="velg-tlf-freeze-btn"
              onClick={(e) => { e.stopPropagation(); toggleFreeze(i); }}
              title={frozen[i] ? 'Frys opp' : 'Frys'}
            >
              {frozen[i] ? '🔓' : '❄'}
            </button>
          </div>
        ))}
      </div>

      {allFrozen && (
        <div class="velg-tlf-result">
          <span class="velg-tlf-number">{formatNumber(digits)}</span>
        </div>
      )}

      <div class="velg-tlf-controls">
        <button class="velg-tlf-btn primary" onClick={spinAll} disabled={spinning && !allFrozen}>
          {spinning ? 'Spinner...' : 'Spin Alt'}
        </button>
        <button class="velg-tlf-btn" onClick={stopAll} disabled={!spinning}>
          Stopp Alt
        </button>
        <button class="velg-tlf-btn" onClick={reset}>
          Nullstill
        </button>
        <button
          class={`velg-tlf-btn${allFrozen ? ' dial-btn' : ''}`}
          onClick={dial}
          disabled={!allFrozen || dialed}
        >
          Ring ☎
        </button>
      </div>
    </div>
  );
}
