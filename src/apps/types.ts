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
  /** Which side of the desktop the icon sits on. Default 'left'. */
  desktopArea?: 'left' | 'right';
  showInStartMenu?: boolean;
  /** Show this app as a tile on the mobile (Windows Phone) Start screen. */
  showOnMobile?: boolean;
  /** Solid accent color for the mobile Metro tile. */
  tileColor?: string;
  /** Render the mobile tile at double width. */
  tileWide?: boolean;
  component: ComponentType<{ instanceId: string }>;
  props?: Record<string, unknown>;
}

export interface ShortcutDefinition {
  id: string;
  title: string;
  icon: string;
  url: string;
  showOnDesktop?: boolean;
  /** Which side of the desktop the icon sits on. Default 'left'. */
  desktopArea?: 'left' | 'right';
  showInStartMenu?: boolean;
  showInShortcutsFolder?: boolean;
  /** Solid accent color for the mobile Metro tile. */
  tileColor?: string;
}
