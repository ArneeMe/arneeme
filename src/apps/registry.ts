import type { AppDefinition } from './types';
import AboutMe from '../components/desktop/apps/AboutMe';
import MyComputer from '../components/desktop/apps/MyComputer';
import Inbox from '../components/desktop/apps/Inbox';
import IframeApp from '../components/desktop/apps/IframeApp';
import Paint from '../components/desktop/apps/Paint';
import VelgTlf from '../components/desktop/apps/VelgTlf';

export const apps: Record<string, AppDefinition> = {
  // ── Visible desktop apps ──────────────────────────────────────────────────
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
  'my-computer': {
    id: 'my-computer',
    title: 'My Computer',
    icon: '/icons/computer.svg',
    defaultSize: { w: 560, h: 420 },
    minSize: { w: 320, h: 260 },
    resizable: true,
    singleton: true,
    showOnDesktop: true,
    showInStartMenu: true,
    component: MyComputer,
  },
  'inbox': {
    id: 'inbox',
    title: 'Inbox - Outlook Express',
    icon: '/icons/mail.svg',
    defaultSize: { w: 640, h: 480 },
    minSize: { w: 400, h: 300 },
    resizable: true,
    singleton: true,
    showOnDesktop: true,
    showInStartMenu: true,
    component: Inbox,
  },
  'paint': {
    id: 'paint',
    title: 'MS Paint',
    icon: '/icons/paint.svg',
    defaultSize: { w: 640, h: 560 },
    minSize: { w: 500, h: 460 },
    resizable: true,
    singleton: false,
    showOnDesktop: true,
    showInStartMenu: true,
    component: Paint,
  },

  // ── Legacy projects (launched from My Computer > Projects) ────────────────
  'bysykkel': {
    id: 'bysykkel',
    title: 'Bergen Bysykkel',
    icon: '/icons/file.svg',
    defaultSize: { w: 900, h: 650 },
    minSize: { w: 400, h: 300 },
    resizable: true,
    singleton: true,
    showOnDesktop: false,
    showInStartMenu: false,
    component: IframeApp,
    props: { url: '/bysykkelApp/index_bysykkel.html' },
  },
  'kanonspill': {
    id: 'kanonspill',
    title: 'Kanonspill',
    icon: '/icons/gamepad.svg',
    defaultSize: { w: 900, h: 650 },
    minSize: { w: 400, h: 300 },
    resizable: true,
    singleton: false,
    showOnDesktop: false,
    showInStartMenu: false,
    component: IframeApp,
    props: { url: '/kanonspill/index_kanon.html' },
  },
  'hoksrud': {
    id: 'hoksrud',
    title: 'Bård Hoksrud',
    icon: '/icons/gamepad.svg',
    defaultSize: { w: 900, h: 650 },
    minSize: { w: 400, h: 300 },
    resizable: true,
    singleton: false,
    showOnDesktop: false,
    showInStartMenu: false,
    component: IframeApp,
    props: { url: '/hoksrudspill/index_hoksrud.html' },
  },
  'velg-tlf': {
    id: 'velg-tlf',
    title: 'Phone Dialer - Velg Telefonnummer',
    icon: '/icons/phone.svg',
    defaultSize: { w: 520, h: 380 },
    minSize: { w: 440, h: 340 },
    resizable: true,
    singleton: true,
    showOnDesktop: false,
    showInStartMenu: true,
    component: VelgTlf,
  },

};
