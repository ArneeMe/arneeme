import { signal, computed } from '@preact/signals';

export interface WindowInstance {
  id: string;
  appId: string;
  title: string;
  icon: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  prevSize?: { w: number; h: number };
  prevPosition?: { x: number; y: number };
}

interface DesktopState {
  windows: WindowInstance[];
  nextZ: number;
}

const STORAGE_KEY = 'arneeme:desktop:v1';
const BASE_Z = 10;

/**
 * nextZ persisteres og vokser for hvert fokus, så uten dette ville tellere
 * fra gamle økter til slutt passert menyer/overlays (z-index ~9990+).
 * Komprimer z-verdiene til BASE_Z..BASE_Z+n ved innlasting, men behold
 * stablingsrekkefølgen og vindusrekkefølgen (taskbar-rekkefølge).
 */
function normalizeZ(state: DesktopState): DesktopState {
  const byZ = [...state.windows].sort((a, b) => a.zIndex - b.zIndex);
  const rank = new Map(byZ.map((w, i) => [w.id, BASE_Z + i]));
  return {
    windows: state.windows.map((w) => ({ ...w, zIndex: rank.get(w.id) ?? BASE_Z })),
    nextZ: BASE_Z + state.windows.length,
  };
}

function loadState(): DesktopState {
  if (typeof localStorage === 'undefined') return { windows: [], nextZ: BASE_Z };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeZ(JSON.parse(raw) as DesktopState);
  } catch {}
  return { windows: [], nextZ: BASE_Z };
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(state: DesktopState) {
  if (typeof localStorage === 'undefined') return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, 300);
}

export const desktopState = signal<DesktopState>(loadState());

export const openWindows = computed(() =>
  desktopState.value.windows.filter((w) => !w.minimized)
);

export const taskbarWindows = computed(() => desktopState.value.windows);

function mutate(fn: (s: DesktopState) => DesktopState) {
  const next = fn(desktopState.value);
  desktopState.value = next;
  scheduleSave(next);
}

export function openApp(
  appId: string,
  title: string,
  icon: string,
  defaultSize: { w: number; h: number },
  singleton: boolean
) {
  const state = desktopState.value;

  if (singleton) {
    const existing = state.windows.find((w) => w.appId === appId);
    if (existing) {
      focusWindow(existing.id);
      if (existing.minimized) toggleMinimize(existing.id);
      return;
    }
  }

  const id = crypto.randomUUID();
  const nextZ = state.nextZ + 1;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const x = Math.max(20, (vw - defaultSize.w) / 2 + Math.random() * 40 - 20);
  const y = Math.max(20, (vh - defaultSize.h) / 2 + Math.random() * 40 - 20);

  mutate((s) => ({
    ...s,
    nextZ,
    windows: [
      ...s.windows,
      {
        id,
        appId,
        title,
        icon,
        position: { x, y },
        size: defaultSize,
        zIndex: nextZ,
        minimized: false,
        maximized: false,
      },
    ],
  }));
}

export function closeWindow(id: string) {
  mutate((s) => ({ ...s, windows: s.windows.filter((w) => w.id !== id) }));
}

export function focusWindow(id: string) {
  mutate((s) => {
    const nextZ = s.nextZ + 1;
    return {
      ...s,
      nextZ,
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, zIndex: nextZ } : w
      ),
    };
  });
}

export function moveWindow(id: string, position: { x: number; y: number }) {
  mutate((s) => ({
    ...s,
    windows: s.windows.map((w) => (w.id === id ? { ...w, position } : w)),
  }));
}

export function resizeWindow(id: string, size: { w: number; h: number }) {
  mutate((s) => ({
    ...s,
    windows: s.windows.map((w) => (w.id === id ? { ...w, size } : w)),
  }));
}

export function toggleMinimize(id: string) {
  mutate((s) => {
    const win = s.windows.find((w) => w.id === id);
    if (!win) return s;
    const minimized = !win.minimized;
    const nextZ = minimized ? s.nextZ : s.nextZ + 1;
    return {
      ...s,
      nextZ,
      windows: s.windows.map((w) =>
        w.id === id
          ? { ...w, minimized, zIndex: minimized ? w.zIndex : nextZ }
          : w
      ),
    };
  });
}

export function clampAllWindows() {
  if (typeof window === 'undefined') return;
  mutate((s) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const MIN_VISIBLE = 40;
    const TITLE_BAR_H = 24;
    const TASKBAR_H = 30;
    return {
      ...s,
      windows: s.windows.map((w) => {
        if (w.maximized) return w;
        const maxX = vw - MIN_VISIBLE;
        const minX = -(w.size.w - MIN_VISIBLE);
        const maxY = vh - TASKBAR_H - TITLE_BAR_H;
        const x = Math.min(maxX, Math.max(minX, w.position.x));
        const y = Math.min(maxY, Math.max(0, w.position.y));
        if (x === w.position.x && y === w.position.y) return w;
        return { ...w, position: { x, y } };
      }),
    };
  });
}

/** Fjern persisterte vinduer hvis app ikke lenger finnes i registeret. */
export function pruneWindows(validAppIds: string[]) {
  const valid = new Set(validAppIds);
  if (desktopState.value.windows.every((w) => valid.has(w.appId))) return;
  mutate((s) => ({ ...s, windows: s.windows.filter((w) => valid.has(w.appId)) }));
}

export function minimizeAll() {
  mutate((s) => ({
    ...s,
    windows: s.windows.map((w) => ({ ...w, minimized: true })),
  }));
}

export function cascadeWindows() {
  if (typeof window === 'undefined') return;
  mutate((s) => {
    const open = [...s.windows]
      .filter((w) => !w.minimized)
      .sort((a, b) => a.zIndex - b.zIndex);
    let nextZ = s.nextZ;
    const placed = new Map<string, { x: number; y: number; z: number }>();
    open.forEach((w, i) => {
      nextZ += 1;
      placed.set(w.id, { x: 16 + i * 26, y: 16 + i * 26, z: nextZ });
    });
    return {
      ...s,
      nextZ,
      windows: s.windows.map((w) => {
        const p = placed.get(w.id);
        if (!p) return w;
        return {
          ...w,
          maximized: false,
          prevPosition: undefined,
          prevSize: undefined,
          position: { x: p.x, y: p.y },
          zIndex: p.z,
        };
      }),
    };
  });
}

export function tileWindows() {
  if (typeof window === 'undefined') return;
  mutate((s) => {
    const open = [...s.windows]
      .filter((w) => !w.minimized)
      .sort((a, b) => a.zIndex - b.zIndex);
    if (open.length === 0) return s;
    const TASKBAR_H = 30;
    const cols = Math.ceil(Math.sqrt(open.length));
    const rows = Math.ceil(open.length / cols);
    const cellW = Math.floor(window.innerWidth / cols);
    const cellH = Math.floor((window.innerHeight - TASKBAR_H) / rows);
    const placed = new Map<string, { x: number; y: number; w: number; h: number }>();
    open.forEach((w, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      placed.set(w.id, { x: col * cellW, y: row * cellH, w: cellW, h: cellH });
    });
    return {
      ...s,
      windows: s.windows.map((w) => {
        const g = placed.get(w.id);
        if (!g) return w;
        return {
          ...w,
          maximized: false,
          prevPosition: undefined,
          prevSize: undefined,
          position: { x: g.x, y: g.y },
          size: { w: g.w, h: g.h },
        };
      }),
    };
  });
}

export function toggleMaximize(id: string) {
  mutate((s) => {
    const win = s.windows.find((w) => w.id === id);
    if (!win) return s;
    if (win.maximized) {
      const nextZ = s.nextZ + 1;
      return {
        ...s,
        nextZ,
        windows: s.windows.map((w) =>
          w.id === id
            ? {
                ...w,
                maximized: false,
                position: w.prevPosition ?? w.position,
                size: w.prevSize ?? w.size,
                prevPosition: undefined,
                prevSize: undefined,
                zIndex: nextZ,
              }
            : w
        ),
      };
    }
    return {
      ...s,
      windows: s.windows.map((w) =>
        w.id === id
          ? {
              ...w,
              maximized: true,
              prevPosition: w.position,
              prevSize: w.size,
            }
          : w
      ),
    };
  });
}
