import type { ShortcutDefinition } from './types';

export const shortcuts: Record<string, ShortcutDefinition> = {
  'kommune': {
    id: 'kommune',
    title: 'Arne Kommune',
    icon: '/icons/globe.svg',
    url: 'https://kommune.arnee.me',
    showOnDesktop: true,
    showInStartMenu: true,
    showInShortcutsFolder: true,
  },
  'attester': {
    id: 'attester',
    title: 'Attester',
    icon: '/icons/document.svg',
    url: 'https://attester.no',
    showOnDesktop: true,
    showInStartMenu: true,
    showInShortcutsFolder: true,
  },
  'badeklubben': {
    id: 'badeklubben',
    title: 'Badeklubben',
    icon: '/icons/wave.svg',
    url: 'https://badeklubben.no',
    showOnDesktop: true,
    showInStartMenu: true,
    showInShortcutsFolder: true,
  },
};
