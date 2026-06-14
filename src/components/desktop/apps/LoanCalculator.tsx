import { useState, useEffect, useMemo, useRef } from 'preact/hooks';

interface Props {
  instanceId: string;
}

interface Inputs {
  amount: number;
  ratePct: number;
  years: number;
  fee: number;
  extraMonthly: number;
  extraOneTime: number;
}

interface SimResult {
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  months: number;
  balanceSeries: number[];
}

const STORAGE_KEY = 'arneeme:loan-calc:v1';
const MAX_MONTHS = 600;

const DEFAULTS: Inputs = {
  amount: 3_000_000,
  ratePct: 5,
  years: 25,
  fee: 0,
  extraMonthly: 0,
  extraOneTime: 0,
};

const nok = new Intl.NumberFormat('nb-NO', {
  style: 'currency',
  currency: 'NOK',
  maximumFractionDigits: 0,
});

function simulate(i: Inputs, withExtras: boolean): SimResult {
  const principal = Math.max(0, i.amount);
  const annualRate = Math.max(0, i.ratePct) / 100;
  const monthlyRate = annualRate / 12;
  const termMonths = Math.max(1, Math.round(i.years * 12));
  const fee = Math.max(0, i.fee);
  const extraMonthly = withExtras ? Math.max(0, i.extraMonthly) : 0;
  const extraOneTime = withExtras ? Math.max(0, i.extraOneTime) : 0;

  let monthlyPayment: number;
  if (monthlyRate === 0) {
    monthlyPayment = principal / termMonths;
  } else {
    monthlyPayment =
      (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));
  }

  let balance = principal;
  let totalInterest = 0;
  let totalPaid = 0;
  const balanceSeries: number[] = [balance];
  let months = 0;

  if (extraOneTime > 0) {
    const applied = Math.min(extraOneTime, balance);
    balance -= applied;
    totalPaid += applied;
  }

  while (balance > 0.005 && months < MAX_MONTHS) {
    months += 1;
    const interest = balance * monthlyRate;
    let principalPart = monthlyPayment - interest;
    if (principalPart < 0) principalPart = 0;

    let pay = principalPart;
    let extra = extraMonthly;

    if (balance - pay < 0) {
      pay = balance;
    }
    balance -= pay;

    if (extra > balance) extra = balance;
    balance -= extra;

    totalInterest += interest;
    totalPaid += interest + pay + extra + fee;
    balanceSeries.push(Math.max(0, balance));
  }

  return {
    monthlyPayment: monthlyPayment + fee,
    totalPaid,
    totalInterest,
    months,
    balanceSeries,
  };
}

function loadInputs(): Inputs {
  if (typeof localStorage === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Inputs>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

function formatMonths(m: number): string {
  if (m <= 0) return '0 mnd';
  const years = Math.floor(m / 12);
  const months = m % 12;
  if (years === 0) return `${months} mnd`;
  if (months === 0) return `${years} år`;
  return `${years} år ${months} mnd`;
}

function numberInput(
  value: number,
  onChange: (n: number) => void,
  step = 1,
  min = 0,
) {
  return (
    <input
      type="number"
      class="loan-calc-input"
      value={Number.isFinite(value) ? value : 0}
      step={step}
      min={min}
      onInput={(e) => {
        const v = parseFloat((e.target as HTMLInputElement).value);
        onChange(Number.isFinite(v) ? v : 0);
      }}
    />
  );
}

function RateInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const format = (n: number) =>
    Number.isFinite(n) ? n.toFixed(2).replace('.', ',') : '0,00';
  const [draft, setDraft] = useState(() => format(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(format(value));
  }, [value, focused]);

  return (
    <input
      type="text"
      inputMode="decimal"
      class="loan-calc-input"
      value={draft}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setDraft(format(value));
      }}
      onInput={(e) => {
        const raw = (e.target as HTMLInputElement).value;
        setDraft(raw);
        const normalized = raw.replace(/\s/g, '').replace(',', '.');
        if (normalized === '' || normalized === '.') {
          onChange(0);
          return;
        }
        const n = parseFloat(normalized);
        if (Number.isFinite(n)) onChange(n);
      }}
    />
  );
}

export default function LoanCalculator({ instanceId: _instanceId }: Props) {
  const [inputs, setInputs] = useState<Inputs>(() => loadInputs());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
      } catch {}
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [inputs]);

  const valid = inputs.amount > 0 && inputs.years > 0;

  const { baseline, withExtras } = useMemo(() => {
    if (!valid) {
      return { baseline: null as SimResult | null, withExtras: null as SimResult | null };
    }
    return {
      baseline: simulate(inputs, false),
      withExtras: simulate(inputs, true),
    };
  }, [inputs, valid]);

  const hasExtras =
    inputs.extraMonthly > 0 || inputs.extraOneTime > 0;

  const update = (key: keyof Inputs) => (n: number) =>
    setInputs((prev) => ({ ...prev, [key]: n }));

  return (
    <div class="loan-calc-app">
      <div class="loan-calc-title">Lånekalkulator</div>
      <div class="loan-calc-subtitle">
        Se hvor mye du sparer på å betale ekstra
      </div>

      <fieldset class="loan-calc-fieldset">
        <legend>Lånet ditt</legend>
        <div class="loan-calc-grid">
          <label>Lånebeløp (kr)</label>
          {numberInput(inputs.amount, update('amount'), 10000)}

          <label>Rente (% per år)</label>
          <RateInput value={inputs.ratePct} onChange={update('ratePct')} />

          <label>Nedbetalingstid (år)</label>
          {numberInput(inputs.years, update('years'), 1, 1)}

          <label>Termingebyr (kr/mnd)</label>
          {numberInput(inputs.fee, update('fee'), 5)}
        </div>
      </fieldset>

      <fieldset class="loan-calc-fieldset">
        <legend>Ekstra innbetalinger</legend>
        <div class="loan-calc-grid">
          <label>Hver måned (kr)</label>
          {numberInput(inputs.extraMonthly, update('extraMonthly'), 500)}

          <label>Engangs nå (kr)</label>
          {numberInput(inputs.extraOneTime, update('extraOneTime'), 10000)}
        </div>
      </fieldset>

      {!valid && (
        <div class="loan-calc-warning">
          Fyll inn lånebeløp og nedbetalingstid for å se beregningen.
        </div>
      )}

      {valid && baseline && withExtras && (
        <>
          <div class="loan-calc-summary">
            <div class="loan-calc-col">
              <div class="loan-calc-col-head">Uten ekstra</div>
              <SummaryRow label="Per måned" value={nok.format(baseline.monthlyPayment)} />
              <SummaryRow label="Totalt betalt" value={nok.format(baseline.totalPaid)} />
              <SummaryRow label="Total rente" value={nok.format(baseline.totalInterest)} />
              <SummaryRow label="Nedbetalt på" value={formatMonths(baseline.months)} />
            </div>
            <div class="loan-calc-col">
              <div class="loan-calc-col-head">Med ekstra</div>
              <SummaryRow
                label="Per måned"
                value={nok.format(withExtras.monthlyPayment + inputs.extraMonthly)}
              />
              <SummaryRow label="Totalt betalt" value={nok.format(withExtras.totalPaid)} />
              <SummaryRow label="Total rente" value={nok.format(withExtras.totalInterest)} />
              <SummaryRow label="Nedbetalt på" value={formatMonths(withExtras.months)} />
            </div>
          </div>

          {hasExtras && (
            <div class="loan-calc-savings">
              Du sparer{' '}
              <strong>{nok.format(Math.max(0, baseline.totalPaid - withExtras.totalPaid))}</strong>
              {' '}og{' '}
              <strong>{formatMonths(Math.max(0, baseline.months - withExtras.months))}</strong>
              {' '}med ekstra innbetalinger.
            </div>
          )}

          <BalanceChart
            baseline={baseline}
            withExtras={withExtras}
            principal={inputs.amount}
          />
        </>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div class="loan-calc-row">
      <span class="loan-calc-row-label">{label}</span>
      <span class="loan-calc-row-value">{value}</span>
    </div>
  );
}

function formatKrShort(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace('.', ',')}M kr`;
  }
  if (n >= 1_000) {
    return `${Math.round(n / 1000)}k kr`;
  }
  return `${Math.round(n)} kr`;
}

function BalanceChart({
  baseline,
  withExtras,
  principal,
}: {
  baseline: SimResult;
  withExtras: SimResult;
  principal: number;
}) {
  const W = 340;
  const H = 180;
  const PAD_L = 52;
  const PAD_R = 8;
  const PAD_T = 8;
  const PAD_B = 22;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const xRight = PAD_L + plotW;
  const yBottom = PAD_T + plotH;

  const maxBalance = Math.max(
    baseline.balanceSeries[0] ?? 0,
    withExtras.balanceSeries[0] ?? 0,
    principal,
    1,
  );
  const maxMonths = Math.max(baseline.months, withExtras.months, 1);
  const maxYears = maxMonths / 12;

  const toPath = (series: number[]) => {
    if (series.length === 0) return '';
    return series
      .map((b, i) => {
        const x = PAD_L + (i / maxMonths) * plotW;
        const y = PAD_T + (1 - b / maxBalance) * plotH;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxBalance);
  const xTicks = [0, maxYears / 2, maxYears];

  return (
    <div class="loan-calc-chart">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect x={0} y={0} width={W} height={H} fill="#ffffff" />

        {yTicks.map((v) => {
          const y = PAD_T + (1 - v / maxBalance) * plotH;
          return (
            <>
              <line
                x1={PAD_L - 3}
                x2={xRight}
                y1={y}
                y2={y}
                stroke="#e0e0e0"
                stroke-width="1"
              />
              <text
                class="loan-calc-axis-text"
                x={PAD_L - 5}
                y={y + 3}
                text-anchor="end"
              >
                {formatKrShort(v)}
              </text>
            </>
          );
        })}

        {xTicks.map((v) => {
          const x = PAD_L + (v / maxYears) * plotW;
          return (
            <>
              <line
                x1={x}
                x2={x}
                y1={PAD_T}
                y2={yBottom + 3}
                stroke="#e0e0e0"
                stroke-width="1"
              />
              <text
                class="loan-calc-axis-text"
                x={x}
                y={yBottom + 13}
                text-anchor="middle"
              >
                {v === 0 ? '0' : `${Math.round(v)} år`}
              </text>
            </>
          );
        })}

        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={yBottom} stroke="#808080" stroke-width="1" />
        <line x1={PAD_L} y1={yBottom} x2={xRight} y2={yBottom} stroke="#808080" stroke-width="1" />

        <path d={toPath(baseline.balanceSeries)} stroke="#a00000" stroke-width="1.5" fill="none" />
        <path d={toPath(withExtras.balanceSeries)} stroke="#000080" stroke-width="1.5" fill="none" />
      </svg>
      <div class="loan-calc-legend">
        <span class="loan-calc-legend-item">
          <span class="loan-calc-swatch" style={{ background: '#a00000' }}></span>
          Uten ekstra
        </span>
        <span class="loan-calc-legend-item">
          <span class="loan-calc-swatch" style={{ background: '#000080' }}></span>
          Med ekstra
        </span>
      </div>
    </div>
  );
}
