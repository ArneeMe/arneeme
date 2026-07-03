import { useState, useEffect, useRef } from 'preact/hooks';
import { closeWindow } from '../../../stores/desktop';
import { MenuBar } from '../MenuBar';

interface Props {
  instanceId: string;
}

interface Note {
  id: string;
  content: string;
  updatedAt: number;
}

interface NotaterState {
  notes: Note[];
  activeId: string;
}

const STORAGE_KEY = 'arneeme:notater:v1';

const WELCOME_NOTE = `Velkommen til Notisblokk!

Alt du skriver lagres automatisk i nettleseren.
Bruk Fil-menyen for å lage nye notater, og
Notater-menyen for å bytte mellom dem.`;

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function buildDefaults(): NotaterState {
  const note: Note = { id: newId(), content: WELCOME_NOTE, updatedAt: Date.now() };
  return { notes: [note], activeId: note.id };
}

function loadState(): NotaterState {
  if (typeof localStorage === 'undefined') return buildDefaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaults();
    const parsed = JSON.parse(raw) as Partial<NotaterState>;
    if (!Array.isArray(parsed.notes) || parsed.notes.length === 0) return buildDefaults();
    const notes: Note[] = parsed.notes.map((n) => ({
      id: typeof n?.id === 'string' ? n.id : newId(),
      content: typeof n?.content === 'string' ? n.content : '',
      updatedAt: typeof n?.updatedAt === 'number' ? n.updatedAt : Date.now(),
    }));
    const activeId = notes.some((n) => n.id === parsed.activeId)
      ? (parsed.activeId as string)
      : notes[0].id;
    return { notes, activeId };
  } catch {
    return buildDefaults();
  }
}

function noteTitle(note: Note): string {
  const firstLine = note.content.split('\n').find((l) => l.trim() !== '') ?? '';
  if (!firstLine.trim()) return 'Uten navn';
  return firstLine.trim().length > 30 ? `${firstLine.trim().slice(0, 30)}…` : firstLine.trim();
}

export default function Notater({ instanceId }: Props) {
  const [state, setState] = useState<NotaterState>(loadState);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setSavedAt(Date.now());
      } catch {}
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state]);

  const active = state.notes.find((n) => n.id === state.activeId) ?? state.notes[0];

  const setContent = (content: string) =>
    setState((s) => ({
      ...s,
      notes: s.notes.map((n) =>
        n.id === s.activeId ? { ...n, content, updatedAt: Date.now() } : n,
      ),
    }));

  const newNote = () =>
    setState((s) => {
      const note: Note = { id: newId(), content: '', updatedAt: Date.now() };
      return { notes: [...s.notes, note], activeId: note.id };
    });

  const deleteActive = () => {
    if (!confirm(`Slette «${noteTitle(active)}»?`)) return;
    setState((s) => {
      const notes = s.notes.filter((n) => n.id !== s.activeId);
      if (notes.length === 0) {
        const note: Note = { id: newId(), content: '', updatedAt: Date.now() };
        return { notes: [note], activeId: note.id };
      }
      return { notes, activeId: notes[0].id };
    });
  };

  const menus = [
    {
      label: 'Fil',
      items: [
        { label: 'Ny', onClick: newNote },
        { label: 'Slett notat', onClick: deleteActive },
        { label: 'Avslutt', onClick: () => closeWindow(instanceId) },
      ],
    },
    {
      label: 'Notater',
      items: state.notes.map((n) => ({
        label: `${n.id === state.activeId ? '● ' : ''}${noteTitle(n)}`,
        onClick: () => setState((s) => ({ ...s, activeId: n.id })),
      })),
    },
    {
      label: 'Rediger',
      items: [{ label: 'Merk alt', onClick: () => textareaRef.current?.select() }],
    },
  ];

  const savedLabel = savedAt
    ? ` · Lagret ${new Date(savedAt).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}`
    : '';

  return (
    <div class="notater-app">
      <MenuBar menus={menus} />
      <textarea
        ref={textareaRef}
        class="notater-textarea"
        value={active.content}
        spellcheck={false}
        onInput={(e) => setContent((e.target as HTMLTextAreaElement).value)}
      />
      <div class="notater-statusbar">
        {state.notes.length} {state.notes.length === 1 ? 'notat' : 'notater'}
        {savedLabel}
      </div>
    </div>
  );
}
