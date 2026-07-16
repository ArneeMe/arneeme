import { useState, useEffect, useRef } from 'preact/hooks';
import { closeWindow } from '../../../stores/desktop';
import { MenuBar } from '../MenuBar';

interface Props {
  instanceId: string;
}

type EcLevel = 'L' | 'M' | 'Q' | 'H';

const SIZES = [128, 192, 256];

const EC_LABELS: Record<EcLevel, string> = {
  L: 'Lav (~7 %)',
  M: 'Middels (~15 %)',
  Q: 'Høy (~25 %)',
  H: 'Maks (~30 %)',
};

// qrcode-bibliotekets grense varierer med EC-nivå; dette er godt innenfor alle.
const MAX_LENGTH = 1000;

export default function QrGenerator({ instanceId }: Props) {
  const [text, setText] = useState('https://arnee.me');
  const [size, setSize] = useState(192);
  const [ecLevel, setEcLevel] = useState<EcLevel>('M');
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const downloadRef = useRef<HTMLAnchorElement>(null);
  const renderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (renderTimer.current) clearTimeout(renderTimer.current);
    renderTimer.current = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const value = text.trim();
      if (!value) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = size;
          canvas.height = size;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, size, size);
        }
        setError(null);
        return;
      }
      import('qrcode')
        .then(({ default: QRCode }) =>
          QRCode.toCanvas(canvas, value, {
            width: size,
            margin: 2,
            errorCorrectionLevel: ecLevel,
            color: { dark: '#000000', light: '#ffffff' },
          }),
        )
        .then(() => setError(null))
        .catch(() => setError('Teksten er for lang for en QR-kode.'));
    }, 250);
    return () => {
      if (renderTimer.current) clearTimeout(renderTimer.current);
    };
  }, [text, size, ecLevel]);

  const saveImage = () => {
    const canvas = canvasRef.current;
    const a = downloadRef.current;
    if (!canvas || !a || !text.trim() || error) return;
    a.href = canvas.toDataURL('image/png');
    a.download = 'qr-kode.png';
    a.click();
  };

  const menus = [
    {
      label: 'Fil',
      items: [
        { label: 'Lagre som PNG', onClick: saveImage },
        { label: 'Avslutt', onClick: () => closeWindow(instanceId) },
      ],
    },
    {
      label: 'Hjelp',
      items: [
        {
          label: 'Om QR-generator...',
          onClick: () =>
            alert('QR-generator\nWindows 95 Edition\n\nSkriv inn tekst eller en URL,\nså lages QR-koden lokalt i nettleseren.'),
        },
      ],
    },
  ];

  return (
    <div class="qr-app">
      <MenuBar menus={menus} />

      <div class="qr-body">
        <div class="field-row-stacked">
          <label for="qr-text">Tekst eller URL:</label>
          <textarea
            id="qr-text"
            class="qr-input"
            rows={3}
            maxLength={MAX_LENGTH}
            value={text}
            spellcheck={false}
            onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
          />
        </div>

        <div class="qr-options">
          <div class="field-row">
            <label for="qr-size">Størrelse:</label>
            <select
              id="qr-size"
              value={size}
              onChange={(e) => setSize(parseInt((e.target as HTMLSelectElement).value, 10))}
            >
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} px
                </option>
              ))}
            </select>
          </div>
          <div class="field-row">
            <label for="qr-ec">Feilretting:</label>
            <select
              id="qr-ec"
              value={ecLevel}
              onChange={(e) => setEcLevel((e.target as HTMLSelectElement).value as EcLevel)}
            >
              {(Object.keys(EC_LABELS) as EcLevel[]).map((level) => (
                <option key={level} value={level}>
                  {EC_LABELS[level]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div class="qr-preview">
          {error ? <p class="qr-error">{error}</p> : null}
          <canvas ref={canvasRef} class="qr-canvas" style={{ display: error ? 'none' : 'block' }} />
        </div>

        <button class="qr-save" onClick={saveImage} disabled={!text.trim() || !!error}>
          Lagre som PNG
        </button>
      </div>

      <div class="qr-statusbar">
        {text.trim().length} / {MAX_LENGTH} tegn · Genereres lokalt
      </div>

      <a ref={downloadRef} style={{ display: 'none' }} />
    </div>
  );
}
