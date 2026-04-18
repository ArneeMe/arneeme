interface Props {
  instanceId: string;
}

const links = [
  { href: '/code', label: 'Projects', external: false },
  { href: 'https://github.com/ArneeMe', label: 'GitHub', external: true },
  { href: 'mailto:arnejobb@protonmail.com', label: 'Email', external: true },
  { href: 'https://www.linkedin.com/in/arne-natsk%C3%A5r', label: 'LinkedIn', external: true },
];

export default function AboutMe({ instanceId: _instanceId }: Props) {
  return (
    <div class="about-me-app">
      <div class="notepad-menubar">
        <button class="menu-item">File</button>
        <button class="menu-item">Edit</button>
        <button class="menu-item">Format</button>
        <button class="menu-item">Help</button>
      </div>

      <div class="notepad-body">
        <div class="about-profile">
          <img
            src="/profile.png"
            alt="Arne Natskår"
            class="about-avatar"
          />
          <div class="about-info">
            <h1>Arne Natskår</h1>
            <p class="about-role">Security Developer</p>
          </div>
        </div>

        <div class="notepad-text">
          <p>
            Hi! I'm a Security Developer based in Norway. I build things
            for the web — from security tooling to small interactive
            experiments.
          </p>
          <p>
            Double-click the icons on the desktop to explore my work,
            or use the Start menu to navigate.
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
