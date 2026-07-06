import { useEffect, useRef, useState } from 'preact/hooks';
import { MenuBar } from '../MenuBar';
import { closeWindow } from '../../../stores/desktop';

interface Props {
  instanceId: string;
}

type Tool = 'pencil' | 'eraser' | 'line' | 'rectangle' | 'ellipse' | 'fill' | 'picker' | 'select';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PALETTE: string[] = [
  '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
  '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000',
  '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff',
  '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040',
];

const CANVAS_W = 560;
const CANVAS_H = 360;
// Åpnede bilder skaleres ned til dette; undo-stakken holder hele bildekopier.
const MAX_W = 1024;
const MAX_H = 768;
const MAX_UNDO = 12;

function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
    255,
  ];
}

function floodFill(ctx: CanvasRenderingContext2D, x: number, y: number, fillColor: string) {
  const { width, height } = ctx.canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const startIdx = (y * width + x) * 4;
  const target = [data[startIdx], data[startIdx + 1], data[startIdx + 2], data[startIdx + 3]];
  const fill = hexToRgba(fillColor);
  if (target[0] === fill[0] && target[1] === fill[1] && target[2] === fill[2] && target[3] === fill[3]) {
    return;
  }
  const stack: [number, number][] = [[x, y]];
  while (stack.length) {
    const [cx, cy] = stack.pop()!;
    if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue;
    const idx = (cy * width + cx) * 4;
    if (
      data[idx] !== target[0] ||
      data[idx + 1] !== target[1] ||
      data[idx + 2] !== target[2] ||
      data[idx + 3] !== target[3]
    ) {
      continue;
    }
    data[idx] = fill[0];
    data[idx + 1] = fill[1];
    data[idx + 2] = fill[2];
    data[idx + 3] = fill[3];
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  ctx.putImageData(imageData, 0, 0);
}

function normalizeRect(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
  };
}

export default function Paint({ instanceId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshotRef = useRef<ImageData | null>(null);
  const undoRef = useRef<ImageData[]>([]);
  const downloadRef = useRef<HTMLAnchorElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Bilde som skal tegnes etter at canvas har byttet størrelse (attributt-
  // endring tømmer canvasen, så tegningen må skje i effekten under).
  const pendingRef = useRef<ImageData | null>(null);

  const [tool, setTool] = useState<Tool>('pencil');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [brush, setBrush] = useState(2);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: CANVAS_W, h: CANVAS_H });
  const [selection, setSelection] = useState<Rect | null>(null);

  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (pendingRef.current) {
      ctx.putImageData(pendingRef.current, 0, 0);
      pendingRef.current = null;
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [canvasSize]);

  const saveUndoSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    undoRef.current.push(snap);
    if (undoRef.current.length > MAX_UNDO) undoRef.current.shift();
  };

  /** Tegn et bilde på canvasen, og bytt canvas-størrelse om nødvendig. */
  const applyImage = (data: ImageData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (data.width === canvas.width && data.height === canvas.height) {
      canvas.getContext('2d')?.putImageData(data, 0, 0);
    } else {
      pendingRef.current = data;
      setCanvasSize({ w: data.width, h: data.height });
    }
  };

  const doUndo = () => {
    const prev = undoRef.current.pop();
    if (prev) {
      setSelection(null);
      applyImage(prev);
    }
  };

  const newCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    undoRef.current = [];
    setSelection(null);
    if (canvas.width === CANVAS_W && canvas.height === CANVAS_H) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      pendingRef.current = null;
      setCanvasSize({ w: CANVAS_W, h: CANVAS_H });
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    saveUndoSnapshot();
    setSelection(null);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveImage = () => {
    const canvas = canvasRef.current;
    const a = downloadRef.current;
    if (!canvas || !a) return;
    a.href = canvas.toDataURL('image/png');
    a.download = 'untitled.png';
    a.click();
  };

  const openImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_W / img.width, MAX_H / img.height);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const octx = off.getContext('2d');
      if (!octx) return;
      // Hvit bunn så gjennomsiktige PNG-er kan viskes/fylles som i MS Paint.
      octx.fillStyle = '#ffffff';
      octx.fillRect(0, 0, w, h);
      octx.drawImage(img, 0, 0, w, h);
      saveUndoSnapshot();
      setSelection(null);
      applyImage(octx.getImageData(0, 0, w, h));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      alert('Kunne ikke åpne bildet.');
    };
    img.src = url;
  };

  const cropToSelection = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selection || selection.w < 1 || selection.h < 1) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(selection.x, selection.y, selection.w, selection.h);
    saveUndoSnapshot();
    setSelection(null);
    applyImage(data);
  };

  const deleteSelection = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selection) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    saveUndoSnapshot();
    ctx.fillStyle = bgColor;
    ctx.fillRect(selection.x, selection.y, selection.w, selection.h);
    setSelection(null);
  };

  const resizeImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const raw = prompt('Ny størrelse i prosent (10–500):', '100');
    if (raw === null) return;
    const pct = parseInt(raw, 10);
    if (!Number.isFinite(pct) || pct < 10 || pct > 500) {
      alert('Angi et tall mellom 10 og 500.');
      return;
    }
    if (pct === 100) return;
    const w = Math.min(MAX_W * 2, Math.max(1, Math.round(canvas.width * (pct / 100))));
    const h = Math.min(MAX_H * 2, Math.max(1, Math.round(canvas.height * (pct / 100))));
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const octx = off.getContext('2d');
    if (!octx) return;
    octx.imageSmoothingEnabled = pct < 100;
    octx.drawImage(canvas, 0, 0, w, h);
    saveUndoSnapshot();
    setSelection(null);
    applyImage(octx.getImageData(0, 0, w, h));
  };

  const getPoint = (e: MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(canvas.width - 1, Math.round((e.clientX - rect.left) * (canvas.width / rect.width)))),
      y: Math.max(0, Math.min(canvas.height - 1, Math.round((e.clientY - rect.top) * (canvas.height / rect.height)))),
    };
  };

  const drawLine = (ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = brush;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const onMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const point = getPoint(e);
    const isRight = e.button === 2;
    const color = isRight ? bgColor : fgColor;

    if (tool !== 'select') setSelection(null);

    if (tool === 'picker') {
      const data = ctx.getImageData(point.x, point.y, 1, 1).data;
      const picked = `#${[data[0], data[1], data[2]].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
      if (isRight) setBgColor(picked);
      else setFgColor(picked);
      return;
    }

    if (tool === 'fill') {
      saveUndoSnapshot();
      floodFill(ctx, point.x, point.y, color);
      return;
    }

    if (tool === 'select') {
      isDrawing.current = true;
      startPoint.current = point;
      setSelection({ x: point.x, y: point.y, w: 0, h: 0 });
      return;
    }

    saveUndoSnapshot();
    isDrawing.current = true;
    startPoint.current = point;
    lastPoint.current = point;

    if (tool === 'pencil' || tool === 'eraser') {
      const drawColor = tool === 'eraser' ? bgColor : color;
      drawLine(ctx, point, point, drawColor);
    } else if (tool === 'line' || tool === 'rectangle' || tool === 'ellipse') {
      snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = getPoint(e);
    setCoords(point);
    if (!isDrawing.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (tool === 'select' && startPoint.current) {
      setSelection(normalizeRect(startPoint.current, point));
      return;
    }

    if (tool === 'pencil' || tool === 'eraser') {
      const drawColor = tool === 'eraser' ? bgColor : fgColor;
      if (lastPoint.current) drawLine(ctx, lastPoint.current, point, drawColor);
      lastPoint.current = point;
    } else if ((tool === 'line' || tool === 'rectangle' || tool === 'ellipse') && snapshotRef.current && startPoint.current) {
      ctx.putImageData(snapshotRef.current, 0, 0);
      const sx = startPoint.current.x;
      const sy = startPoint.current.y;
      if (tool === 'line') {
        drawLine(ctx, startPoint.current, point, fgColor);
      } else if (tool === 'rectangle') {
        ctx.strokeStyle = fgColor;
        ctx.lineWidth = brush;
        ctx.strokeRect(Math.min(sx, point.x), Math.min(sy, point.y), Math.abs(point.x - sx), Math.abs(point.y - sy));
      } else {
        ctx.strokeStyle = fgColor;
        ctx.lineWidth = brush;
        ctx.beginPath();
        ctx.ellipse(
          (sx + point.x) / 2,
          (sy + point.y) / 2,
          Math.abs(point.x - sx) / 2,
          Math.abs(point.y - sy) / 2,
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
    }
  };

  const onMouseUp = () => {
    if (tool === 'select' && isDrawing.current) {
      setSelection((sel) => (sel && sel.w > 1 && sel.h > 1 ? sel : null));
    }
    isDrawing.current = false;
    lastPoint.current = null;
    startPoint.current = null;
    snapshotRef.current = null;
  };

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) openImageFile(file);
  };

  const tools: { id: Tool; label: string; icon: string }[] = [
    { id: 'select', label: 'Merk område', icon: '/icons/paint/select.svg' },
    { id: 'pencil', label: 'Blyant', icon: '/icons/paint/pencil.svg' },
    { id: 'eraser', label: 'Viskelær', icon: '/icons/paint/eraser.svg' },
    { id: 'line', label: 'Linje', icon: '/icons/paint/line.svg' },
    { id: 'rectangle', label: 'Rektangel', icon: '/icons/paint/rectangle.svg' },
    { id: 'ellipse', label: 'Ellipse', icon: '/icons/paint/ellipse.svg' },
    { id: 'fill', label: 'Fyll', icon: '/icons/paint/fill.svg' },
    { id: 'picker', label: 'Velg farge', icon: '/icons/paint/picker.svg' },
  ];

  const paintMenus = [
    {
      label: 'File',
      items: [
        { label: 'New', onClick: newCanvas },
        { label: 'Open...', onClick: () => fileInputRef.current?.click() },
        { label: 'Save', onClick: saveImage },
        { label: 'Exit', onClick: () => closeWindow(instanceId) },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', onClick: doUndo },
        { label: 'Delete Selection', onClick: deleteSelection },
        { label: 'Select None', onClick: () => setSelection(null) },
      ],
    },
    {
      label: 'Image',
      items: [
        { label: 'Crop to Selection', onClick: cropToSelection },
        { label: 'Resize...', onClick: resizeImage },
        { label: 'Clear Image', onClick: clearCanvas },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'About MS Paint...', onClick: () => alert('MS Paint\nWindows 95 Edition\n\nDraw something nice!\nTips: dra og slipp et bilde på lerretet for å åpne det.') },
      ],
    },
  ];

  return (
    <div class="paint-app">
      <MenuBar menus={paintMenus} />

      <div class="paint-body">
        <div class="paint-tools">
          {tools.map((t) => (
            <button
              key={t.id}
              class={`paint-tool${tool === t.id ? ' active' : ''}`}
              onClick={() => setTool(t.id)}
              title={t.label}
            >
              <img
                src={t.icon}
                alt={t.label}
                style={{ width: 16, height: 16, imageRendering: 'pixelated' }}
                draggable={false}
              />
            </button>
          ))}
          <div class="paint-brush-size">
            {[1, 2, 4, 7].map((b) => (
              <button
                key={b}
                class={`paint-brush-btn${brush === b ? ' active' : ''}`}
                onClick={() => setBrush(b)}
                title={`Størrelse ${b}`}
              >
                <span class="paint-brush-dot" style={{ width: b * 2, height: b * 2 }} />
              </button>
            ))}
          </div>
        </div>

        <div class="paint-canvas-wrap" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
          <div class="paint-canvas-holder">
            <canvas
              ref={canvasRef}
              width={canvasSize.w}
              height={canvasSize.h}
              class="paint-canvas"
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onContextMenu={onContextMenu}
            />
            {selection && selection.w > 0 && selection.h > 0 && (
              <div
                class="paint-selection"
                style={{
                  left: `${(selection.x / canvasSize.w) * 100}%`,
                  top: `${(selection.y / canvasSize.h) * 100}%`,
                  width: `${(selection.w / canvasSize.w) * 100}%`,
                  height: `${(selection.h / canvasSize.h) * 100}%`,
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div class="paint-palette-row">
        <div class="paint-active-colors" title="Venstreklikk på paletten: forgrunn. Høyreklikk: bakgrunn">
          <span class="paint-swatch fg" style={{ background: fgColor }} />
          <span class="paint-swatch bg" style={{ background: bgColor }} />
        </div>
        <div class="paint-palette">
          {PALETTE.map((c) => (
            <button
              key={c}
              class="paint-palette-swatch"
              style={{ background: c }}
              onClick={() => setFgColor(c)}
              onContextMenu={(e) => {
                e.preventDefault();
                setBgColor(c);
              }}
              title={c}
            />
          ))}
        </div>
      </div>

      <div class="paint-statusbar">
        <span>{coords ? `${coords.x}, ${coords.y}` : ''}</span>
        <span>
          {selection && selection.w > 0 ? `Utvalg: ${selection.w} x ${selection.h} · ` : ''}
          {canvasSize.w} x {canvasSize.h}
        </span>
      </div>

      <a ref={downloadRef} style={{ display: 'none' }} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const input = e.target as HTMLInputElement;
          const file = input.files?.[0];
          if (file) openImageFile(file);
          input.value = '';
        }}
      />
    </div>
  );
}
