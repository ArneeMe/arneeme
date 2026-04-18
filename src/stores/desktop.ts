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

function loadState(): DesktopState {
  if (typeof localStorage === 'undefined') return { windows: [], nextZ: 10 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DesktopState;
  } catch {}
  return { windows: [], nextZ: 10 };
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

export function toggleMaximize(id: string) {
  mutate((s) => {
    const win = s.windows.find((w) => w.id === id);
    if (!win) return s;
    if (win.maximized) {
      return {
        ...s,
        windows: s.windows.map((w) =>
          w.id === id
            ? {
                ...w,
                maximized: false,
                position: w.prevPosition ?? w.position,
                size: w.prevSize ?? w.size,
                prevPosition: undefined,
                prevSize: undefined,
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
