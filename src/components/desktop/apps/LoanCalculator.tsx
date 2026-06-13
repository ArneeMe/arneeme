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

  const reset = () => setInputs(DEFAULTS);

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
          {numberInput(inputs.ratePct, update('ratePct'), 0.05)}

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

          <BalanceChart baseline={baseline} withExtras={withExtras} />
        </>
      )}

      <div class="loan-calc-controls">
        <button class="loan-calc-btn" onClick={reset}>Nullstill</button>
      </div>
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

function BalanceChart({
  baseline,
  withExtras,
}: {
  baseline: SimResult;
  withExtras: SimResult;
}) {
  const W = 300;
  const H = 140;
  const PAD = 8;
  const maxBalance = Math.max(
    baseline.balanceSeries[0] ?? 0,
    withExtras.balanceSeries[0] ?? 0,
    1,
  );
  const maxMonths = Math.max(baseline.months, withExtras.months, 1);

  const toPath = (series: number[]) => {
    if (series.length === 0) return '';
    return series
      .map((b, i) => {
        const x = PAD + (i / maxMonths) * (W - PAD * 2);
        const y = PAD + (1 - b / maxBalance) * (H - PAD * 2);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  return (
    <div class="loan-calc-chart">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect x={0} y={0} width={W} height={H} fill="#ffffff" />
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
