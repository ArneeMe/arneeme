import { useState, useEffect, useRef } from 'preact/hooks';
import { closeWindow } from '../../../stores/desktop';
import { MenuBar } from '../MenuBar';

interface Props {
  instanceId: string;
}

interface Task {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

interface OppgaverState {
  tasks: Task[];
}

const STORAGE_KEY = 'arneeme:oppgaver:v1';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function loadState(): OppgaverState {
  if (typeof localStorage === 'undefined') return { tasks: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tasks: [] };
    const parsed = JSON.parse(raw) as Partial<OppgaverState>;
    if (!Array.isArray(parsed.tasks)) return { tasks: [] };
    return {
      tasks: parsed.tasks.map((t) => ({
        id: typeof t?.id === 'string' ? t.id : newId(),
        text: typeof t?.text === 'string' ? t.text : '',
        done: t?.done === true,
        createdAt: typeof t?.createdAt === 'number' ? t.createdAt : Date.now(),
      })),
    };
  } catch {
    return { tasks: [] };
  }
}

export default function Oppgaver({ instanceId }: Props) {
  const [state, setState] = useState<OppgaverState>(loadState);
  const [draft, setDraft] = useState('');
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

  const addTask = () => {
    const text = draft.trim();
    if (!text) return;
    setState((s) => ({
      tasks: [...s.tasks, { id: newId(), text, done: false, createdAt: Date.now() }],
    }));
    setDraft('');
  };

  const toggleTask = (id: string) =>
    setState((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }));

  const removeTask = (id: string) =>
    setState((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));

  const menus = [
    {
      label: 'Fil',
      items: [{ label: 'Avslutt', onClick: () => closeWindow(instanceId) }],
    },
    {
      label: 'Rediger',
      items: [
        {
          label: 'Fjern fullførte',
          onClick: () => setState((s) => ({ tasks: s.tasks.filter((t) => !t.done) })),
        },
        {
          label: 'Fjern alle',
          onClick: () => {
            if (state.tasks.length === 0 || confirm('Fjerne alle oppgaver?')) {
              setState({ tasks: [] });
            }
          },
        },
      ],
    },
  ];

  const sorted = [...state.tasks].sort((a, b) =>
    a.done === b.done ? a.createdAt - b.createdAt : a.done ? 1 : -1,
  );
  const doneCount = state.tasks.filter((t) => t.done).length;

  return (
    <div class="oppgaver-app">
      <MenuBar menus={menus} />

      <div class="oppgaver-addrow">
        <input
          type="text"
          class="oppgaver-input"
          placeholder="Ny oppgave..."
          value={draft}
          onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addTask();
          }}
        />
        <button onClick={addTask}>Legg til</button>
      </div>

      <div class="oppgaver-list">
        {sorted.length === 0 && (
          <p class="oppgaver-empty">Ingen oppgaver. Godt jobbet!</p>
        )}
        {sorted.map((t) => (
          <div key={t.id} class="oppgaver-row">
            <input
              type="checkbox"
              id={`task-${t.id}`}
              checked={t.done}
              onChange={() => toggleTask(t.id)}
            />
            <label for={`task-${t.id}`} class={t.done ? 'oppgaver-done' : ''}>
              {t.text}
            </label>
            <button
              class="oppgaver-remove"
              title="Fjern"
              onClick={() => removeTask(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div class="oppgaver-statusbar">
        {doneCount} av {state.tasks.length} fullført
      </div>
    </div>
  );
}
