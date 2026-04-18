import { signal } from '@preact/signals';

export type BootPhase = 'bios' | 'splash' | 'login' | 'desktop';

const STORAGE_KEY = 'arneeme:boot:v1';

function hasBootedBefore(): boolean {
  if (typeof localStorage === 'undefined') return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'seen';
  } catch {
    return true;
  }
}

function markSeen() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, 'seen');
  } catch {}
}

function clearSeen() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export const bootPhase = signal<BootPhase>(hasBootedBefore() ? 'desktop' : 'bios');

export function advanceBoot(next: BootPhase) {
  bootPhase.value = next;
  if (next === 'desktop') markSeen();
}

export function logOff() {
  clearSeen();
  bootPhase.value = 'bios';
}
