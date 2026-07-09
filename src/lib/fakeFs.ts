import { apps } from '../apps/registry';

export interface FsNode {
  name: string;
  type: 'dir' | 'file';
  /** Registered app launched when this "program" is started. */
  appId?: string;
  /** Lines printed by TYPE in the terminal. */
  content?: string[];
  /** Skjult for DIR, men kan leses med TYPE hvis man kjenner navnet. */
  hidden?: boolean;
  children?: FsNode[];
}

function exeName(appId: string): string {
  return `${appId.replace(/-/g, '').toUpperCase().slice(0, 8)}.EXE`;
}

function programNodes(filter: (id: string) => boolean): FsNode[] {
  return Object.values(apps)
    .filter((a) => filter(a.id))
    .map((a) => ({ name: exeName(a.id), type: 'file' as const, appId: a.id }));
}

const LEGACY = ['bysykkel', 'kanonspill', 'hoksrud'];

// Bygges lazily: registry importerer Terminal som importerer denne fila,
// så `apps` er ikke initialisert ennå når modulen evalueres.
let cachedRoot: FsNode | null = null;

function buildRoot(): FsNode {
  return {
  name: 'C:',
  type: 'dir',
  children: [
    {
      name: 'WINDOWS',
      type: 'dir',
      children: [
        {
          name: 'WIN.COM',
          type: 'file',
          content: ['MZ▓▒░@╬ÉПЯ$#&%!... ', 'Dette er en binærfil. Det visste du egentlig.'],
        },
        {
          name: 'SYSTEM.INI',
          type: 'file',
          content: [
            '[boot]',
            'shell=arnee.me',
            'mood=nostalgisk',
            '',
            '[386Enh]',
            'device=kaffe.386',
            'MinTimeslice=fredag',
          ],
        },
        {
          name: 'CLIPPY.DLL',
          type: 'file',
          content: [
            'Det ser ut som du prøver å lese en DLL-fil.',
            'Vil du ha hjelp med det?',
            '',
            '  ( ) Ja',
            '  ( ) Nei',
            '  (•) Aldri spør meg igjen',
            '',
            'PS fra Clippy: DIR viser ikke alt. Noen filer er HEMMELIG(e).TXT...',
          ],
        },
        {
          name: 'HEMMELIG.TXT',
          type: 'file',
          hidden: true,
          content: [
            'Gratulerer, du fant den skjulte filen!',
            '',
            'Premie: prøv kommandoen MATRIX. Eller HACK, hvis du tør.',
            'PS: FORMAT C: er også trygt. Antakeligvis.',
          ],
        },
      ],
    },
    {
      name: 'PROGRAMMER',
      type: 'dir',
      children: programNodes((id) => !!apps[id].showInStartMenu),
    },
    {
      name: 'SPILL',
      type: 'dir',
      children: programNodes((id) => LEGACY.includes(id)),
    },
    {
      name: 'AUTOEXEC.BAT',
      type: 'file',
      content: [
        '@ECHO OFF',
        'PATH C:\\WINDOWS;C:\\PROGRAMMER',
        'SET BLASTER=A220 I5 D1',
        'REM Ikke rør denne linjen. Ingen husker hvorfor den er her.',
        'LH C:\\WINDOWS\\NOSTALGI.EXE',
      ],
    },
    {
      name: 'CONFIG.SYS',
      type: 'file',
      content: [
        'DEVICE=C:\\WINDOWS\\HIMEM.SYS',
        'DOS=HIGH,UMB',
        'FILES=42',
        'BUFFERS=du store min',
      ],
    },
  ],
  };
}

function fakeRoot(): FsNode {
  if (!cachedRoot) cachedRoot = buildRoot();
  return cachedRoot;
}

/** Resolve a DOS-ish path argument relative to cwd (array of dir names, starting with 'C:'). */
export function resolvePath(cwd: string[], arg: string): { node: FsNode; path: string[] } | null {
  const parts = arg.split(/[\\/]+/).filter((p) => p !== '');
  let path: string[];
  if (arg.startsWith('\\') || arg.startsWith('/') || /^c:/i.test(arg)) {
    path = ['C:'];
    if (/^c:/i.test(parts[0] ?? '')) parts.shift();
  } else {
    path = [...cwd];
  }
  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      if (path.length > 1) path.pop();
      continue;
    }
    const node = nodeAt(path);
    const child = node?.children?.find((c) => c.name.toUpperCase() === part.toUpperCase());
    if (!child) return null;
    path.push(child.name);
  }
  const node = nodeAt(path);
  return node ? { node, path } : null;
}

export function nodeAt(path: string[]): FsNode | null {
  let node: FsNode = fakeRoot();
  for (const part of path.slice(1)) {
    const child = node.children?.find((c) => c.name === part);
    if (!child) return null;
    node = child;
  }
  return node;
}

export function formatPath(path: string[]): string {
  return path.length === 1 ? 'C:\\' : `C:\\${path.slice(1).join('\\')}`;
}
