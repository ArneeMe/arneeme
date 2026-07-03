import { useState, useEffect, useRef } from 'preact/hooks';
import { openApp, closeWindow } from '../../../stores/desktop';
import { apps } from '../../../apps/registry';
import { resolvePath, formatPath, nodeAt } from '../../../lib/fakeFs';

interface Props {
  instanceId: string;
}

const MAX_LINES = 500;

const BANNER = [
  'Microsoft(R) Windows 95',
  '   (C)Copyright Microsoft Corp 1981-1995.',
  '',
];

interface CmdCtx {
  args: string[];
  raw: string;
  print: (s: string | string[]) => void;
  clear: () => void;
  cwd: string[];
  setCwd: (p: string[]) => void;
  close: () => void;
  confirm: (prompt: string, onAnswer: (answer: string) => void) => void;
  startInterval: (fn: () => void, ms: number) => void;
}

const COMMANDS: Record<string, { help: string; run: (ctx: CmdCtx) => void }> = {
  help: {
    help: 'Viser denne listen.',
    run: (ctx) => {
      ctx.print(
        Object.entries(COMMANDS).map(
          ([name, c]) => `${name.toUpperCase().padEnd(10)} ${c.help}`,
        ),
      );
    },
  },
  dir: {
    help: 'Viser innholdet i gjeldende mappe.',
    run: (ctx) => {
      const node = nodeAt(ctx.cwd);
      if (!node?.children) {
        ctx.print('Finner ikke banen angitt.');
        return;
      }
      ctx.print([` Innhold i ${formatPath(ctx.cwd)}`, '']);
      for (const c of node.children) {
        const size = c.type === 'dir' ? '<DIR>'.padEnd(9) : `${(c.name.length * 1337) % 48000}`.padStart(9);
        ctx.print(`12.08.95  09:5${c.name.length % 10}    ${size}  ${c.name}`);
      }
      const files = node.children.filter((c) => c.type === 'file').length;
      ctx.print(['', `        ${files} fil(er)`, '']);
    },
  },
  cd: {
    help: 'Bytter mappe. Bruk CD .. eller CD \\.',
    run: (ctx) => {
      const arg = ctx.args[0];
      if (!arg) {
        ctx.print(formatPath(ctx.cwd));
        return;
      }
      const resolved = resolvePath(ctx.cwd, arg);
      if (!resolved || resolved.node.type !== 'dir') {
        ctx.print('Finner ikke banen angitt.');
        return;
      }
      ctx.setCwd(resolved.path);
    },
  },
  start: {
    help: 'Starter et program. START uten argument gir liste.',
    run: (ctx) => {
      const arg = ctx.args[0]?.toLowerCase();
      if (!arg) {
        ctx.print(['Tilgjengelige programmer:', ...Object.keys(apps).map((id) => `  ${id}`)]);
        return;
      }
      // Match registry id directly, or an .EXE name from the fake filesystem.
      const app =
        apps[arg] ??
        Object.values(apps).find(
          (a) => `${a.id.replace(/-/g, '')}.exe` === arg || a.id.replace(/-/g, '') === arg,
        );
      if (!app) {
        ctx.print(`Finner ikke '${ctx.args[0]}'. Prøv 'start' uten argument for liste.`);
        return;
      }
      openApp(app.id, app.title, app.icon, app.defaultSize, app.singleton ?? false);
      ctx.print(`Starter ${app.title}...`);
    },
  },
  whoami: {
    help: 'Viser gjeldende bruker.',
    run: (ctx) => ctx.print('ARNEE-PC\\arne'),
  },
  ver: {
    help: 'Viser Windows-versjonen.',
    run: (ctx) => ctx.print(['', 'Windows 95 [Versjon 4.00.950]', '']),
  },
  cls: {
    help: 'Tømmer skjermen.',
    run: (ctx) => ctx.clear(),
  },
  echo: {
    help: 'Skriver ut tekst.',
    run: (ctx) => ctx.print(ctx.raw || 'ECHO er på.'),
  },
  date: {
    help: 'Viser dagens dato.',
    run: (ctx) => ctx.print(`Gjeldende dato er ${new Date().toLocaleDateString('nb-NO')}`),
  },
  time: {
    help: 'Viser klokkeslettet.',
    run: (ctx) => ctx.print(`Gjeldende klokkeslett er ${new Date().toLocaleTimeString('nb-NO')}`),
  },
  format: {
    help: 'Formaterer en stasjon. Eller?',
    run: (ctx) => {
      if (ctx.args[0]?.toLowerCase() !== 'c:') {
        ctx.print('Angi stasjonen som skal formateres, f.eks. FORMAT C:');
        return;
      }
      ctx.confirm(
        'ADVARSEL: ALLE DATA PÅ STASJON C: GÅR TAPT!\nFortsette med formatering (J/N)?',
        () => ctx.print(['', 'Tilgang nektet. Filene dine er trygge. :-)', '']),
      );
    },
  },
  hack: {
    help: '???',
    run: (ctx) => {
      const steps = [
        'Kobler til NSA-mainframe...',
        'Omgår brannmur............ OK',
        'Knekker kryptering [██        ] 23%',
        'Knekker kryptering [██████    ] 61%',
        'Knekker kryptering [█████████ ] 94%',
        '',
        '*** TILGANG NEKTET ***',
        'Fint forsøk. Denne hendelsen er rapportert.',
      ];
      let i = 0;
      ctx.startInterval(() => {
        if (i < steps.length) ctx.print(steps[i++]);
      }, 450);
    },
  },
  matrix: {
    help: 'Følg den hvite kaninen. Trykk en tast for å stoppe.',
    run: (ctx) => {
      const chars = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿ01';
      ctx.startInterval(() => {
        let line = '';
        for (let i = 0; i < 40; i++) {
          line += Math.random() < 0.6 ? ' ' : chars[Math.floor(Math.random() * chars.length)];
        }
        ctx.print(line);
      }, 90);
    },
  },
  exit: {
    help: 'Avslutter MS-DOS-økten.',
    run: (ctx) => ctx.close(),
  },
};

export default function Terminal({ instanceId }: Props) {
  const [lines, setLines] = useState<string[]>(BANNER);
  const [cwd, setCwd] = useState<string[]>(['C:']);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const histIdx = useRef(-1);
  const confirmRef = useRef<((answer: string) => void) | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const print = (s: string | string[]) => {
    const add = Array.isArray(s) ? s.flatMap((l) => l.split('\n')) : s.split('\n');
    setLines((prev) => {
      const next = [...prev, ...add];
      return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
    });
  };

  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      return true;
    }
    return false;
  };

  const runLine = (line: string) => {
    const trimmed = line.trim();

    if (confirmRef.current) {
      const handler = confirmRef.current;
      confirmRef.current = null;
      handler(trimmed);
      return;
    }

    if (!trimmed) {
      print('');
      return;
    }

    const [cmdName, ...args] = trimmed.split(/\s+/);
    const raw = trimmed.slice(cmdName.length).trim();
    const cmd = COMMANDS[cmdName.toLowerCase()];
    if (!cmd) {
      print([
        `'${cmdName}' gjenkjennes ikke som en intern eller ekstern kommando.`,
        '',
      ]);
      return;
    }
    cmd.run({
      args,
      raw,
      print,
      clear: () => setLines([]),
      cwd,
      setCwd,
      close: () => closeWindow(instanceId),
      confirm: (prompt, onAnswer) => {
        print(prompt);
        confirmRef.current = onAnswer;
      },
      startInterval: (fn, ms) => {
        stopInterval();
        intervalRef.current = setInterval(fn, ms);
      },
    });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    // Any key stops a running matrix/hack animation.
    if (intervalRef.current && stopInterval()) {
      print('');
    }

    if (e.key === 'Enter') {
      const line = input;
      print(`${formatPath(cwd)}> ${line}`);
      setInput('');
      if (line.trim()) {
        setHistory((h) => [...h, line]);
      }
      histIdx.current = -1;
      runLine(line);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      histIdx.current =
        histIdx.current === -1
          ? history.length - 1
          : Math.max(0, histIdx.current - 1);
      setInput(history[histIdx.current]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx.current === -1) return;
      histIdx.current += 1;
      if (histIdx.current >= history.length) {
        histIdx.current = -1;
        setInput('');
      } else {
        setInput(history[histIdx.current]);
      }
    }
  };

  return (
    <div class="terminal-app" onMouseDown={() => inputRef.current?.focus()}>
      <div class="terminal-output" ref={outputRef}>
        {lines.map((l, i) => (
          <div key={i} class="terminal-line">
            {l || ' '}
          </div>
        ))}
        <div class="terminal-promptrow">
          <span>{formatPath(cwd)}&gt;&nbsp;</span>
          <input
            ref={inputRef}
            class="terminal-input"
            value={input}
            autofocus
            spellcheck={false}
            autocomplete="off"
            onInput={(e) => setInput((e.target as HTMLInputElement).value)}
            onKeyDown={onKeyDown}
          />
        </div>
      </div>
    </div>
  );
}
