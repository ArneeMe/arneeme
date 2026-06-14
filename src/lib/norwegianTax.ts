// 2025 norske skattesatser. Juster ved skifte av år.
// Kilde: Skatteetaten — satser for personinntekt/lønn 2025.
// Dette er en forenklet beregning og dekker ikke alle fradrag/særtilfeller.

const MINSTEFRADRAG_RATE = 0.46;
const MINSTEFRADRAG_MIN = 4_000;
const MINSTEFRADRAG_MAX = 92_000;

const PERSONFRADRAG = 108_550;

const ALMINNELIG_INNTEKT_RATE = 0.22;

const TRYGDEAVGIFT_RATE = 0.078;
const TRYGDEAVGIFT_NEDRE_GRENSE = 99_650;

const TRINNSKATT: Array<{ from: number; to: number; rate: number }> = [
  { from: 0,         to: 217_400,   rate: 0       },
  { from: 217_400,   to: 306_050,   rate: 0.017   },
  { from: 306_050,   to: 697_150,   rate: 0.040   },
  { from: 697_150,   to: 942_400,   rate: 0.137   },
  { from: 942_400,   to: 1_410_750, rate: 0.167   },
  { from: 1_410_750, to: Infinity,  rate: 0.177   },
];

function trinnskatt(gross: number): number {
  let tax = 0;
  for (const t of TRINNSKATT) {
    if (gross <= t.from) break;
    const taxable = Math.min(gross, t.to) - t.from;
    if (taxable > 0) tax += taxable * t.rate;
  }
  return tax;
}

export function norwegianAnnualTax(grossAnnual: number): number {
  if (!Number.isFinite(grossAnnual) || grossAnnual <= 0) return 0;

  const minstefradrag = Math.min(
    MINSTEFRADRAG_MAX,
    Math.max(MINSTEFRADRAG_MIN, grossAnnual * MINSTEFRADRAG_RATE),
  );
  const alminneligGrunnlag = Math.max(
    0,
    grossAnnual - minstefradrag - PERSONFRADRAG,
  );
  const alminneligInntekt = alminneligGrunnlag * ALMINNELIG_INNTEKT_RATE;

  const trygdeavgift =
    Math.max(0, grossAnnual - TRYGDEAVGIFT_NEDRE_GRENSE) * TRYGDEAVGIFT_RATE;

  return alminneligInntekt + trygdeavgift + trinnskatt(grossAnnual);
}
