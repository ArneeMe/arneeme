import * as preact from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { MenuBar } from '../MenuBar';
import { closeWindow } from '../../../stores/desktop';

interface Props {
  instanceId: string;
}

type Tool = 'pencil' | 'eraser' | 'line' | 'rectangle' | 'fill' | 'picker';

const PALETTE: string[] = [
  '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
  '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000',
  '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff',
  '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040',
];

const CANVAS_W = 560;
const CANVAS_H = 360;

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

export default function Paint({ instanceId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const snapshotRef = useRef<ImageData | null>(null);
  const undoRef = useRef<ImageData[]>([]);
  const downloadRef = useRef<HTMLAnchorElement>(null);

  const [tool, setTool] = useState<Tool>('pencil');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [brush, setBrush] = useState(2);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas with white background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const saveUndoSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    undoRef.current.push(snap);
    if (undoRef.current.length > 20) undoRef.current.shift();
  };

  const doUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const prev = undoRef.current.pop();
    if (prev) ctx.putImageData(prev, 0, 0);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    saveUndoSnapshot();
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

  const getPoint = (e: MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.round((e.clientX - rect.left) * (canvas.width / rect.width)),
      y: Math.round((e.clientY - rect.top) * (canvas.height / rect.height)),
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

    saveUndoSnapshot();
    isDrawing.current = true;
    startPoint.current = point;
    lastPoint.current = point;

    if (tool === 'pencil' || tool === 'eraser') {
      const drawColor = tool === 'eraser' ? bgColor : color;
      drawLine(ctx, point, point, drawColor);
    } else if (tool === 'line' || tool === 'rectangle') {
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

    if (tool === 'pencil' || tool === 'eraser') {
      const drawColor = tool === 'eraser' ? bgColor : fgColor;
      if (lastPoint.current) drawLine(ctx, lastPoint.current, point, drawColor);
      lastPoint.current = point;
    } else if ((tool === 'line' || tool === 'rectangle') && snapshotRef.current && startPoint.current) {
      ctx.putImageData(snapshotRef.current, 0, 0);
      if (tool === 'line') {
        drawLine(ctx, startPoint.current, point, fgColor);
      } else {
        ctx.strokeStyle = fgColor;
        ctx.lineWidth = brush;
        const sx = startPoint.current.x;
        const sy = startPoint.current.y;
        ctx.strokeRect(Math.min(sx, point.x), Math.min(sy, point.y), Math.abs(point.x - sx), Math.abs(point.y - sy));
      }
    }
  };

  const onMouseUp = () => {
    isDrawing.current = false;
    lastPoint.current = null;
    startPoint.current = null;
    snapshotRef.current = null;
  };

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  const toolIcons: Record<Tool, preact.JSX.Element> = {
    pencil: (
      <svg viewBox="0 0 12 12" width="14" height="14">
        <rect x="7.5" y="1" width="2.5" height="7" rx="0.4" transform="rotate(45 8.75 4.5)" fill="#333" />
        <polygon points="2.5,9.5 1.5,11 3.5,11" fill="#333" />
      </svg>
    ),
    eraser: (
      <svg viewBox="0 0 12 12" width="14" height="14">
        <rect x="1" y="5.5" width="10" height="4.5" rx="0.5" fill="#f99" stroke="#333" strokeWidth="0.7" />
        <rect x="6" y="5.5" width="5" height="4.5" rx="0.5" fill="#fcc" stroke="#333" strokeWidth="0.7" />
      </svg>
    ),
    line: (
      <svg viewBox="0 0 12 12" width="14" height="14">
        <line x1="2" y1="10" x2="10" y2="2" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    rectangle: (
      <svg viewBox="0 0 12 12" width="14" height="14">
        <rect x="1.5" y="2.5" width="9" height="7" stroke="#333" strokeWidth="1.2" fill="none" />
      </svg>
    ),
    fill: (
      <svg viewBox="0 0 12 12" width="14" height="14">
        <path d="M2 8 L2 2 L7 2 L9 4 L7 6 L4 6 L4 8 Z" fill="#4af" stroke="#333" strokeWidth="0.6" />
        <ellipse cx="9.5" cy="9.5" rx="1.8" ry="1.8" fill="#fa4" stroke="#333" strokeWidth="0.6" />
        <line x1="7.5" y1="7.5" x2="8.2" y2="8.2" stroke="#333" strokeWidth="0.8" />
      </svg>
    ),
    picker: (
      <svg viewBox="0 0 12 12" width="14" height="14">
        <path d="M5 8 L9 4 L10.5 5.5 L6.5 9.5 Z" fill="#ccc" stroke="#333" strokeWidth="0.6" />
        <line x1="8" y1="2.5" x2="10.5" y2="5" stroke="#333" strokeWidth="1" strokeLinecap="round" />
        <circle cx="3" cy="10" r="1.5" fill="#f55" stroke="#333" strokeWidth="0.5" />
        <line x1="4.5" y1="8.5" x2="4" y2="9" stroke="#333" strokeWidth="0.7" />
      </svg>
    ),
  };

  const tools: { id: Tool; label: string }[] = [
    { id: 'pencil', label: 'Pencil' },
    { id: 'eraser', label: 'Eraser' },
    { id: 'line', label: 'Line' },
    { id: 'rectangle', label: 'Rectangle' },
    { id: 'fill', label: 'Fill' },
    { id: 'picker', label: 'Pick color' },
  ];

  const paintMenus = [
    {
      label: 'File',
      items: [
        { label: 'New', onClick: clearCanvas },
        { label: 'Save', onClick: saveImage },
        { label: 'Exit', onClick: () => closeWindow(instanceId) },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', onClick: doUndo },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'About MS Paint...', onClick: () => alert('MS Paint\nWindows 95 Edition\n\nDraw something nice!') },
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
              <span class="paint-tool-icon">{toolIcons[t.id]}</span>
            </button>
          ))}
          <div class="paint-brush-size">
            {[1, 2, 4, 7].map((b) => (
              <button
                key={b}
                class={`paint-brush-btn${brush === b ? ' active' : ''}`}
                onClick={() => setBrush(b)}
                title={`Size ${b}`}
              >
                <span class="paint-brush-dot" style={{ width: b * 2, height: b * 2 }} />
              </button>
            ))}
          </div>
        </div>

        <div class="paint-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            class="paint-canvas"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onContextMenu={onContextMenu}
          />
          <canvas ref={previewRef} width={CANVAS_W} height={CANVAS_H} style={{ display: 'none' }} />
        </div>
      </div>

      <div class="paint-palette-row">
        <div class="paint-active-colors" title="Left-click palette: foreground. Right-click: background">
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
        <span>{CANVAS_W} x {CANVAS_H}</span>
      </div>

      <a ref={downloadRef} style={{ display: 'none' }} />
    </div>
  );
}
