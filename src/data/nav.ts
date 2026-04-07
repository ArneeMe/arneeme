export interface NavLink {
  href: string;
  label: string;
  external?: boolean;
}

export const headerNavLinks: NavLink[] = [
  { href: '/', label: 'Hjem' },
  { href: '/code', label: 'Eksempler' },
  { href: '/contact', label: 'Kontakt' },
];

export const homeNavLinks: NavLink[] = [
  { href: '/code', label: 'Prosjekter' },
  { href: '/contact', label: 'Kontakt' },
  { href: 'https://github.com/ArneeMe', label: 'GitHub', external: true },
];
