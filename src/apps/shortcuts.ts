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
};
