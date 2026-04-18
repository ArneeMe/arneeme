import type { AppDefinition } from './types';
import AboutMe from '../components/desktop/apps/AboutMe';

export const apps: Record<string, AppDefinition> = {
  'about-me': {
    id: 'about-me',
    title: 'About Me - Notepad',
    icon: '/icons/notepad.svg',
    defaultSize: { w: 520, h: 400 },
    minSize: { w: 300, h: 200 },
    resizable: true,
    singleton: true,
    showOnDesktop: true,
    showInStartMenu: true,
    component: AboutMe,
  },
};
