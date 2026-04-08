export interface NavLink {
  href: string;
  label: string;
  external?: boolean;
}

export const homeNavLinks: NavLink[] = [
  { href: '/code', label: 'Prosjekter' },
  { href: 'https://github.com/ArneeMe', label: 'GitHub', external: true },
  { href: 'mailto:arnejobb@protonmail.com', label: 'Email', external: true },
  { href: 'https://www.linkedin.com/in/arne-natskår', label: 'LinkedIn', external: true },
];
