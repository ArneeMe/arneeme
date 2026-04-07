export interface NavLink {
  href: string;
  label: string;
  external?: boolean;
}

export const homeNavLinks: NavLink[] = [
  { href: '/code', label: 'Prosjekter' },
  { href: '/contact', label: 'Kontakt' },
  { href: 'https://github.com/ArneeMe', label: 'GitHub', external: true },
];
