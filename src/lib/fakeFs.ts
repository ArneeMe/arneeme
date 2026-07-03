import { apps } from '../apps/registry';

export interface FsNode {
  name: string;
  type: 'dir' | 'file';
  /** Registered app launched when this "program" is started. */
  appId?: string;
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

export const fakeRoot: FsNode = {
  name: 'C:',
  type: 'dir',
  children: [
    {
      name: 'WINDOWS',
      type: 'dir',
      children: [
        { name: 'WIN.COM', type: 'file' },
        { name: 'SYSTEM.INI', type: 'file' },
        { name: 'CLIPPY.DLL', type: 'file' },
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
    { name: 'AUTOEXEC.BAT', type: 'file' },
    { name: 'CONFIG.SYS', type: 'file' },
  ],
};

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
  let node: FsNode = fakeRoot;
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
