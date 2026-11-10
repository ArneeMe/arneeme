import ordUrl from './ord.txt?url';

const VOKALER: Record<string, number> = { a: 7, e: 9, i: 5, o: 4, u: 3, y: 1, æ: 1, ø: 2, å: 2 };
const KONSONANTER: Record<string, number> = {
  b: 3, d: 5, f: 4, g: 4, h: 3, j: 2, k: 4, l: 5, m: 3, n: 6, p: 2, r: 6, s: 6, t: 6, v: 3,
};

export const MAKS_VOKALER = 5;
export const MAKS_KONSONANTER = 6;
export const ANTALL = 9;

export interface Bunker {
  vokaler: string[];
  konsonanter: string[];
}

const bland = <T,>(xs: T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const lagBunke = (vekter: Record<string, number>) =>
  bland(Object.entries(vekter).flatMap(([b, n]) => Array<string>(n).fill(b)));

export function nyeBunker(): Bunker {
  return { vokaler: lagBunke(VOKALER), konsonanter: lagBunke(KONSONANTER) };
}

export function erVokal(b: string): boolean {
  return b in VOKALER;
}

export function fyllResten(bokstaver: string[], bunker: Bunker): string[] {
  const ut = [...bokstaver];
  let vokaler = ut.filter(erVokal).length;
  let konsonanter = ut.length - vokaler;
  while (ut.length < ANTALL) {
    const vokal =
      konsonanter >= MAKS_KONSONANTER || (vokaler < MAKS_VOKALER && Math.random() < 0.4);
    ut.push(vokal ? bunker.vokaler.pop()! : bunker.konsonanter.pop()!);
    if (vokal) vokaler++;
    else konsonanter++;
  }
  return ut;
}

export function kanLages(ord: string, bokstaver: string[]): boolean {
  const igjen = [...bokstaver];
  for (const b of ord) {
    const i = igjen.indexOf(b);
    if (i < 0) return false;
    igjen.splice(i, 1);
  }
  return true;
}

let ordliste: Promise<Set<string>> | null = null;

export function hentOrd(): Promise<Set<string>> {
  ordliste ??= fetch(ordUrl)
    .then((r) => r.text())
    .then((t) => new Set(t.split('\n').filter(Boolean)));
  return ordliste;
}

export function finnBeste(ord: Set<string>, bokstaver: string[], maks = 10): string[] {
  const treff = [...ord].filter((o) => o.length <= bokstaver.length && kanLages(o, bokstaver));
  return treff.sort((a, b) => b.length - a.length || a.localeCompare(b, 'nb')).slice(0, maks);
}
