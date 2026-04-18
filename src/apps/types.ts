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
}
