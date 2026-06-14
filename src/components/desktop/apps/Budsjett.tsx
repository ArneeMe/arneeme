import { useState, useEffect, useMemo, useRef } from 'preact/hooks';
import { norwegianAnnualTax } from '../../../lib/norwegianTax';

interface Props {
  instanceId: string;
}

interface Line {
  id: string;
  label: string;
  amount: number;
}

type TaxMode = 'flat' | 'norwegian';

interface BudgetState {
  salary: number;
  taxMode: TaxMode;
  flatTaxPct: number;
  extraIncome: Line[];
  expenses: Line[];
}

const STORAGE_KEY = 'arneeme:budsjett:v1';

const DEFAULT_EXPENSES: string[] = [
  'Husleie / Boliglån',
  'Mat & dagligvarer',
  'Strøm',
  'Internett / Telefon',
  'Forsikring',
  'Transport',
  'Trening / Abonnementer',
  'Reise / Fritid',
];

const PALETTE = [
  '#000080',
  '#a00000',
  '#208020',
  '#c8a000',
  '#804080',
  '#008080',
  '#c06030',
  '#406090',
  '#888888',
];

const nok = new Intl.NumberFormat('nb-NO', {
  style: 'currency',
  currency: 'NOK',
  maximumFractionDigits: 0,
});

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function buildDefaults(): BudgetState {
  return {
    salary: 0,
    taxMode: 'flat',
    flatTaxPct: 35,
    extraIncome: [],
    expenses: DEFAULT_EXPENSES.map((label) => ({
      id: newId(),
      label,
      amount: 0,
    })),
  };
}

function loadState(): BudgetState {
  if (typeof localStorage === 'undefined') return buildDefaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaults();
    const parsed = JSON.parse(raw) as Partial<BudgetState>;
    const base = buildDefaults();
    return {
      salary: typeof parsed.salary === 'number' ? parsed.salary : base.salary,
      taxMode: parsed.taxMode === 'norwegian' ? 'norwegian' : 'flat',
      flatTaxPct:
        typeof parsed.flatTaxPct === 'number' ? parsed.flatTaxPct : base.flatTaxPct,
      extraIncome: Array.isArray(parsed.extraIncome)
        ? parsed.extraIncome.map((l) => ({
            id: typeof l?.id === 'string' ? l.id : newId(),
            label: typeof l?.label === 'string' ? l.label : '',
            amount: typeof l?.amount === 'number' ? l.amount : 0,
          }))
        : base.extraIncome,
      expenses: Array.isArray(parsed.expenses)
        ? parsed.expenses.map((l) => ({
            id: typeof l?.id === 'string' ? l.id : newId(),
            label: typeof l?.label === 'string' ? l.label : '',
            amount: typeof l?.amount === 'number' ? l.amount : 0,
          }))
        : base.expenses,
    };
  } catch {
    return buildDefaults();
  }
}

function IntInput({
  value,
  onChange,
  step = 100,
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <input
      type="number"
      class="budsjett-input"
      value={Number.isFinite(value) ? value : 0}
      step={step}
      min={0}
      onInput={(e) => {
        const v = parseFloat((e.target as HTMLInputElement).value);
        onChange(Number.isFinite(v) ? v : 0);
      }}
    />
  );
}

function DecimalInput({
  value,
  onChange,
  decimals = 2,
}: {
  value: number;
  onChange: (n: number) => void;
  decimals?: number;
}) {
  const format = (n: number) =>
    Number.isFinite(n) ? n.toFixed(decimals).replace('.', ',') : '0,00';
  const [draft, setDraft] = useState(() => format(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(format(value));
  }, [value, focused]);

  return (
    <input
      type="text"
      inputMode="decimal"
      class="budsjett-input"
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

function LineRow({
  line,
  onLabelChange,
  onAmountChange,
  onRemove,
  placeholder,
}: {
  line: Line;
  onLabelChange: (s: string) => void;
  onAmountChange: (n: number) => void;
  onRemove: () => void;
  placeholder: string;
}) {
  return (
    <div class="budsjett-line">
      <input
        type="text"
        class="budsjett-input budsjett-line-label"
        value={line.label}
        placeholder={placeholder}
        onInput={(e) => onLabelChange((e.target as HTMLInputElement).value)}
      />
      <IntInput value={line.amount} onChange={onAmountChange} />
      <button
        type="button"
        class="budsjett-remove"
        title="Fjern"
        onClick={onRemove}
      >
        ×
      </button>
    </div>
  );
}

interface Computed {
  grossMonthly: number;
  taxMonthly: number;
  netMonthly: number;
  totalExpenses: number;
  savings: number;
  savingsRate: number;
  effectiveTaxPct: number;
}

function compute(state: BudgetState): Computed {
  const extra = state.extraIncome.reduce((s, l) => s + (l.amount || 0), 0);
  const grossMonthly = Math.max(0, state.salary) + extra;

  let taxMonthly: number;
  if (state.taxMode === 'flat') {
    taxMonthly = (grossMonthly * Math.max(0, state.flatTaxPct)) / 100;
  } else {
    taxMonthly = norwegianAnnualTax(grossMonthly * 12) / 12;
  }
  if (taxMonthly > grossMonthly) taxMonthly = grossMonthly;

  const netMonthly = grossMonthly - taxMonthly;
  const totalExpenses = state.expenses.reduce(
    (s, l) => s + (l.amount || 0),
    0,
  );
  const savings = netMonthly - totalExpenses;
  const savingsRate = netMonthly > 0 ? (savings / netMonthly) * 100 : 0;
  const effectiveTaxPct = grossMonthly > 0 ? (taxMonthly / grossMonthly) * 100 : 0;

  return {
    grossMonthly,
    taxMonthly,
    netMonthly,
    totalExpenses,
    savings,
    savingsRate,
    effectiveTaxPct,
  };
}

function savingsRateStyle(rate: number, hasIncome: boolean): {
  color: string;
  label: string;
} {
  if (!hasIncome) return { color: '#888', label: '–' };
  if (rate < 0) return { color: '#a00000', label: 'Underskudd' };
  if (rate < 10) return { color: '#a00000', label: 'Lav' };
  if (rate < 20) return { color: '#c8a000', label: 'Middels' };
  return { color: '#208020', label: 'God' };
}

function formatPct(n: number, decimals = 1): string {
  return `${n.toFixed(decimals).replace('.', ',')} %`;
}

export default function Budsjett({ instanceId: _instanceId }: Props) {
  const [state, setState] = useState<BudgetState>(() => loadState());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {}
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state]);

  const computed = useMemo(() => compute(state), [state]);

  const updateLine = (
    list: 'extraIncome' | 'expenses',
    id: string,
    patch: Partial<Line>,
  ) =>
    setState((prev) => ({
      ...prev,
      [list]: prev[list].map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));

  const removeLine = (list: 'extraIncome' | 'expenses', id: string) =>
    setState((prev) => ({
      ...prev,
      [list]: prev[list].filter((l) => l.id !== id),
    }));

  const addLine = (list: 'extraIncome' | 'expenses') =>
    setState((prev) => ({
      ...prev,
      [list]: [...prev[list], { id: newId(), label: '', amount: 0 }],
    }));

  const rate = savingsRateStyle(computed.savingsRate, computed.grossMonthly > 0);

  return (
    <div class="budsjett-app">
      <div class="budsjett-title">Budsjett</div>
      <div class="budsjett-subtitle">
        Hvor mye sitter du igjen med hver måned?
      </div>

      <fieldset class="budsjett-fieldset">
        <legend>Inntekt</legend>
        <div class="budsjett-grid">
          <label>Bruttolønn (kr/mnd)</label>
          <IntInput
            value={state.salary}
            onChange={(n) => setState((p) => ({ ...p, salary: n }))}
            step={1000}
          />

          <label>Skatt</label>
          <div class="budsjett-radios">
            <label class="budsjett-radio">
              <input
                type="radio"
                name="taxMode"
                checked={state.taxMode === 'flat'}
                onChange={() => setState((p) => ({ ...p, taxMode: 'flat' }))}
              />
              Flat sats
            </label>
            <label class="budsjett-radio">
              <input
                type="radio"
                name="taxMode"
                checked={state.taxMode === 'norwegian'}
                onChange={() =>
                  setState((p) => ({ ...p, taxMode: 'norwegian' }))
                }
              />
              Norsk skattetabell (2025)
            </label>
          </div>

          {state.taxMode === 'flat' ? (
            <>
              <label>Skattesats (%)</label>
              <DecimalInput
                value={state.flatTaxPct}
                onChange={(n) => setState((p) => ({ ...p, flatTaxPct: n }))}
              />
            </>
          ) : (
            <>
              <label>Effektiv sats</label>
              <div class="budsjett-readout">
                {formatPct(computed.effectiveTaxPct)}
              </div>
            </>
          )}
        </div>

        <div class="budsjett-sublabel">Andre inntekter</div>
        <div class="budsjett-lines">
          {state.extraIncome.length === 0 && (
            <div class="budsjett-empty">Ingen ekstra inntekter lagt til.</div>
          )}
          {state.extraIncome.map((l) => (
            <LineRow
              key={l.id}
              line={l}
              placeholder="Beskrivelse (f.eks. Sidegig)"
              onLabelChange={(s) =>
                updateLine('extraIncome', l.id, { label: s })
              }
              onAmountChange={(n) =>
                updateLine('extraIncome', l.id, { amount: n })
              }
              onRemove={() => removeLine('extraIncome', l.id)}
            />
          ))}
          <button
            type="button"
            class="budsjett-add"
            onClick={() => addLine('extraIncome')}
          >
            + Legg til inntekt
          </button>
        </div>
      </fieldset>

      <fieldset class="budsjett-fieldset">
        <legend>Utgifter</legend>
        <div class="budsjett-lines">
          {state.expenses.length === 0 && (
            <div class="budsjett-empty">Ingen utgifter lagt til.</div>
          )}
          {state.expenses.map((l) => (
            <LineRow
              key={l.id}
              line={l}
              placeholder="Beskrivelse"
              onLabelChange={(s) => updateLine('expenses', l.id, { label: s })}
              onAmountChange={(n) =>
                updateLine('expenses', l.id, { amount: n })
              }
              onRemove={() => removeLine('expenses', l.id)}
            />
          ))}
          <button
            type="button"
            class="budsjett-add"
            onClick={() => addLine('expenses')}
          >
            + Legg til utgift
          </button>
        </div>
      </fieldset>

      <div class="budsjett-summary">
        <div class="budsjett-summary-head">Sammendrag</div>
        <SummaryRow
          label="Netto inntekt"
          monthly={computed.netMonthly}
          yearly={computed.netMonthly * 12}
        />
        <SummaryRow
          label="Utgifter"
          monthly={computed.totalExpenses}
          yearly={computed.totalExpenses * 12}
        />
        <SummaryRow
          label="Sparing"
          monthly={computed.savings}
          yearly={computed.savings * 12}
          strong
        />
        <div class="budsjett-row budsjett-rate">
          <span class="budsjett-row-label">Sparerate</span>
          <span class="budsjett-row-value">
            <span
              class="budsjett-rate-dot"
              style={{ background: rate.color }}
            />
            {formatPct(computed.savingsRate)}
            <span class="budsjett-rate-tag" style={{ color: rate.color }}>
              {rate.label}
            </span>
          </span>
        </div>
      </div>

      <ExpenseChart expenses={state.expenses} />
    </div>
  );
}

function SummaryRow({
  label,
  monthly,
  yearly,
  strong,
}: {
  label: string;
  monthly: number;
  yearly: number;
  strong?: boolean;
}) {
  return (
    <div class={`budsjett-row${strong ? ' budsjett-row-strong' : ''}`}>
      <span class="budsjett-row-label">{label}</span>
      <span class="budsjett-row-value">
        {nok.format(monthly)} <span class="budsjett-row-sub">/mnd</span>
      </span>
      <span class="budsjett-row-value budsjett-row-yearly">
        {nok.format(yearly)} <span class="budsjett-row-sub">/år</span>
      </span>
    </div>
  );
}

function ExpenseChart({ expenses }: { expenses: Line[] }) {
  const slices = useMemo(() => {
    const positive = expenses
      .filter((e) => e.amount > 0)
      .map((e) => ({
        label: e.label.trim() || 'Uten navn',
        amount: e.amount,
      }))
      .sort((a, b) => b.amount - a.amount);

    if (positive.length <= 8) return positive;
    const top = positive.slice(0, 7);
    const rest = positive.slice(7);
    const restSum = rest.reduce((s, x) => s + x.amount, 0);
    top.push({ label: 'Annet', amount: restSum });
    return top;
  }, [expenses]);

  const total = slices.reduce((s, x) => s + x.amount, 0);

  if (slices.length === 0 || total <= 0) {
    return (
      <div class="budsjett-chart">
        <div class="budsjett-chart-head">Utgiftsfordeling</div>
        <div class="budsjett-empty">Legg inn utgifter for å se fordelingen.</div>
      </div>
    );
  }

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 70;
  const innerR = 38;

  let acc = 0;
  const arcs = slices.map((s, i) => {
    const startAngle = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += s.amount;
    const endAngle = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    const sx = cx + Math.cos(startAngle) * outerR;
    const sy = cy + Math.sin(startAngle) * outerR;
    const ex = cx + Math.cos(endAngle) * outerR;
    const ey = cy + Math.sin(endAngle) * outerR;
    const isx = cx + Math.cos(endAngle) * innerR;
    const isy = cy + Math.sin(endAngle) * innerR;
    const iex = cx + Math.cos(startAngle) * innerR;
    const iey = cy + Math.sin(startAngle) * innerR;

    // Edge case: single slice (full circle) — draw as donut with two arcs.
    if (slices.length === 1) {
      const d = [
        `M ${cx + outerR} ${cy}`,
        `A ${outerR} ${outerR} 0 1 1 ${cx - outerR} ${cy}`,
        `A ${outerR} ${outerR} 0 1 1 ${cx + outerR} ${cy}`,
        `M ${cx + innerR} ${cy}`,
        `A ${innerR} ${innerR} 0 1 0 ${cx - innerR} ${cy}`,
        `A ${innerR} ${innerR} 0 1 0 ${cx + innerR} ${cy}`,
        'Z',
      ].join(' ');
      return { d, color: PALETTE[i % PALETTE.length], slice: s };
    }

    const d = [
      `M ${sx} ${sy}`,
      `A ${outerR} ${outerR} 0 ${large} 1 ${ex} ${ey}`,
      `L ${isx} ${isy}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${iex} ${iey}`,
      'Z',
    ].join(' ');
    return { d, color: PALETTE[i % PALETTE.length], slice: s };
  });

  return (
    <div class="budsjett-chart">
      <div class="budsjett-chart-head">Utgiftsfordeling</div>
      <div class="budsjett-chart-body">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {arcs.map((a) => (
            <path
              d={a.d}
              fill={a.color}
              stroke="#ffffff"
              stroke-width="1"
              fill-rule="evenodd"
            />
          ))}
        </svg>
        <ul class="budsjett-legend">
          {arcs.map((a) => {
            const pct = (a.slice.amount / total) * 100;
            return (
              <li>
                <span
                  class="budsjett-legend-swatch"
                  style={{ background: a.color }}
                />
                <span class="budsjett-legend-label">{a.slice.label}</span>
                <span class="budsjett-legend-value">
                  {nok.format(a.slice.amount)} ({formatPct(pct, 0)})
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
