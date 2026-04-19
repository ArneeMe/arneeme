import { useState, useEffect, useRef } from 'preact/hooks';

export interface MenuItem {
  label: string;
  onClick: () => void;
}

export interface Menu {
  label: string;
  items: MenuItem[];
}

interface Props {
  menus: Menu[];
}

export function MenuBar({ menus }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open]);

  return (
    <div class="explorer-menubar" ref={barRef}>
      {menus.map((menu) => (
        <div key={menu.label} class="menu-root" style={{ position: 'relative' }}>
          <button
            class={`menu-item${open === menu.label ? ' active' : ''}`}
            onClick={() => setOpen(open === menu.label ? null : menu.label)}
          >
            {menu.label}
          </button>
          {open === menu.label && (
            <div class="menubar-dropdown">
              {menu.items.map((item) => (
                <button
                  key={item.label}
                  class="menubar-dropdown-item"
                  onClick={() => {
                    setOpen(null);
                    item.onClick();
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
