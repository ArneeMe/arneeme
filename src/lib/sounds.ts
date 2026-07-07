import { signal } from '@preact/signals';

const STORAGE_KEY = 'arneeme:sound:v1';

function loadMuted(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'muted';
  } catch {
    return false;
  }
}

export const soundMuted = signal(loadMuted());

export function toggleMuted() {
  soundMuted.value = !soundMuted.value;
  try {
    localStorage.setItem(STORAGE_KEY, soundMuted.value ? 'muted' : 'on');
  } catch {}
}

// Alle lyder syntetiseres med WebAudio – ingen binærfiler i repoet.
let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface ToneOpts {
  freq: number;
  at?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  endFreq?: number;
}

function tone(ac: AudioContext, opts: ToneOpts) {
  const { freq, at = 0, dur = 0.2, type = 'triangle', gain = 0.06, endFreq } = opts;
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export type SoundName = 'startup' | 'ding' | 'click' | 'win' | 'boom';

export function playSound(name: SoundName) {
  if (soundMuted.value) return;
  const ac = audioCtx();
  if (!ac) return;

  switch (name) {
    case 'startup': {
      // Eno-aktig oppstartsakkord: Db-dur som svulmer opp og dør sakte ut.
      const chord = [277.18, 415.3, 554.37, 830.61, 1108.73];
      chord.forEach((freq, i) => {
        tone(ac, { freq, at: i * 0.12, dur: 2.4 - i * 0.15, type: 'sine', gain: 0.05 });
      });
      break;
    }
    case 'ding':
      tone(ac, { freq: 830, dur: 0.45, type: 'triangle', gain: 0.07 });
      tone(ac, { freq: 660, at: 0.02, dur: 0.4, type: 'sine', gain: 0.04 });
      break;
    case 'click':
      tone(ac, { freq: 1200, dur: 0.03, type: 'square', gain: 0.025 });
      break;
    case 'win':
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        tone(ac, { freq, at: i * 0.11, dur: 0.25, type: 'triangle', gain: 0.06 });
      });
      break;
    case 'boom':
      tone(ac, { freq: 180, dur: 0.6, type: 'sawtooth', gain: 0.12, endFreq: 40 });
      tone(ac, { freq: 90, at: 0.02, dur: 0.5, type: 'square', gain: 0.06, endFreq: 30 });
      break;
  }
}
