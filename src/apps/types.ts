import type { ComponentType } from 'preact';

export interface AppDefinition {
  id: string;
  title: string;
  icon: string;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  resizable?: boolean;
  singleton?: boolean;
  showOnDesktop?: boolean;
  showInStartMenu?: boolean;
  component: ComponentType<{ instanceId: string }>;
  props?: Record<string, unknown>;
}

export interface ShortcutDefinition {
  id: string;
  title: string;
  icon: string;
  url: string;
  showOnDesktop?: boolean;
  showInStartMenu?: boolean;
  showInShortcutsFolder?: boolean;
}
