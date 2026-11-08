export interface Svar {
  verdi: number;
  steg: string[];
}

export interface Resultat {
  avstand: number;
  antall: number;
  svar: Svar[];
}

export function los(tall: number[], mal: number, maks = 10): Resultat {
  const funnet = new Map<string, Svar>();
  let best = Infinity;

  const se = (verdi: number, steg: string[]) => {
    const avstand = Math.abs(verdi - mal);
    if (avstand > best) return;
    if (avstand < best) {
      best = avstand;
      funnet.clear();
    }
    const nokkel = [...steg].sort().join('|');
    if (!funnet.has(nokkel)) funnet.set(nokkel, { verdi, steg });
  };

  const sok = (verdier: number[], steg: string[][]) => {
    for (let i = 0; i < verdier.length; i++) {
      for (let j = i + 1; j < verdier.length; j++) {
        const forst = verdier[i] >= verdier[j];
        const a = forst ? verdier[i] : verdier[j];
        const b = forst ? verdier[j] : verdier[i];
        const sa = forst ? steg[i] : steg[j];
        const sb = forst ? steg[j] : steg[i];
        const rest = verdier.filter((_, k) => k !== i && k !== j);
        const restSteg = steg.filter((_, k) => k !== i && k !== j);
        const prov = (r: number, tegn: string) => {
          const s = [...sa, ...sb, `${a} ${tegn} ${b} = ${r}`];
          se(r, s);
          if (rest.length > 0) sok([...rest, r], [...restSteg, s]);
        };
        prov(a + b, '+');
        if (a !== b && a - b !== b) prov(a - b, '−');
        if (b !== 1) prov(a * b, '×');
        if (b !== 1 && a % b === 0 && a / b !== b) prov(a / b, '÷');
      }
    }
  };

  tall.forEach((t) => se(t, []));
  sok(tall, tall.map(() => []));
  const svar = [...funnet.values()].sort(
    (x, y) => x.steg.length - y.steg.length || x.steg.join().localeCompare(y.steg.join()),
  );
  return { avstand: best, antall: svar.length, svar: svar.slice(0, maks) };
}

export function trekk(store: number): { tall: number[]; mal: number } {
  const bland = <T,>(xs: T[]) => {
    const a = [...xs];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const sma = bland(Array.from({ length: 20 }, (_, i) => (i % 10) + 1)).slice(0, 6 - store);
  const tall = [...bland([25, 50, 75, 100]).slice(0, store), ...sma];
  return { tall, mal: 100 + Math.floor(Math.random() * 900) };
}
