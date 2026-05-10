import { MenuBar } from '../MenuBar';
import { closeWindow } from '../../../stores/desktop';

interface Props {
  instanceId: string;
}

const links = [
  { href: 'https://github.com/ArneeMe', label: 'GitHub', external: true },
  { href: 'mailto:arnejobb@protonmail.com', label: 'Email', external: true },
  { href: 'https://www.linkedin.com/in/arne-natsk%C3%A5r', label: 'LinkedIn', external: true },
];

export default function AboutMe({ instanceId }: Props) {
  const menus = [
    {
      label: 'Fil',
      items: [{ label: 'Avslutt', onClick: () => closeWindow(instanceId) }],
    },
    {
      label: 'Hjelp',
      items: [{ label: 'Om Notepad...', onClick: () => alert('Notepad\nWindows 95-utgave') }],
    },
  ];

  return (
    <div class="about-me-app">
      <MenuBar menus={menus} />

      <div class="notepad-body">
        <div class="about-info">
          <h1>Arne Natskår</h1>
          <p class="about-role">Sikkerhetsutvikler</p>
        </div>

        <div class="notepad-text">
          <p>
            Heisann! Titt rundt på nettsiden til en sikkerhetsutvikler.
            Ta kontakt hvis du lurer på noe som helst.
          </p>

          <div class="about-links">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target={l.external ? '_blank' : undefined}
                rel={l.external ? 'noopener noreferrer' : undefined}
                class="about-link"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
