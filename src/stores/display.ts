import { signal } from '@preact/signals';

export type PatternId = 'none' | 'dots' | 'diagonal' | 'grid' | 'weave';

export interface DisplaySettings {
  bgColor: string;
  pattern: PatternId;
  screensaver: { enabled: boolean; timeoutMin: number };
}

const STORAGE_KEY = 'arneeme:display:v1';

export const DEFAULT_SETTINGS: DisplaySettings = {
  bgColor: '#008080',
  pattern: 'none',
  screensaver: { enabled: true, timeoutMin: 5 },
};

export const PATTERN_CSS: Record<PatternId, { image: string; size: string }> = {
  none: { image: 'none', size: 'auto' },
  dots: {
    image: 'radial-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1px)',
    size: '8px 8px',
  },
  diagonal: {
    image:
      'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.15) 0 1px, transparent 1px 8px)',
    size: 'auto',
  },
  grid: {
    image:
      'linear-gradient(rgba(0, 0, 0, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.15) 1px, transparent 1px)',
    size: '16px 16px',
  },
  weave: {
    image:
      'repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.12) 0 2px, transparent 2px 6px), repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.12) 0 2px, transparent 2px 6px)',
    size: 'auto',
  },
};

const PATTERN_IDS = Object.keys(PATTERN_CSS) as PatternId[];

function loadState(): DisplaySettings {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<DisplaySettings>;
    return {
      bgColor:
        typeof parsed.bgColor === 'string' && /^#[0-9a-f]{6}$/i.test(parsed.bgColor)
          ? parsed.bgColor
          : DEFAULT_SETTINGS.bgColor,
      pattern: PATTERN_IDS.includes(parsed.pattern as PatternId)
        ? (parsed.pattern as PatternId)
        : DEFAULT_SETTINGS.pattern,
      screensaver: {
        enabled: parsed.screensaver?.enabled !== false,
        timeoutMin:
          typeof parsed.screensaver?.timeoutMin === 'number'
            ? Math.min(60, Math.max(1, parsed.screensaver.timeoutMin))
            : DEFAULT_SETTINGS.screensaver.timeoutMin,
      },
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(state: DisplaySettings) {
  if (typeof localStorage === 'undefined') return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, 300);
}

export const displaySettings = signal<DisplaySettings>(loadState());

/** Forced screensaver preview (Forhåndsvis button in Skjerminnstillinger). */
export const previewScreensaver = signal(false);

export function updateDisplay(patch: Partial<DisplaySettings>) {
  const next = { ...displaySettings.value, ...patch };
  displaySettings.value = next;
  scheduleSave(next);
}
