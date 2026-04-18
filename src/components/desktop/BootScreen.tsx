import { useEffect } from 'preact/hooks';
import { bootPhase, advanceBoot } from '../../stores/boot';
import { LoginDialog } from './LoginDialog';

export function BootScreen() {
  const phase = bootPhase.value;

  useEffect(() => {
    if (phase === 'bios') {
      const t = setTimeout(() => advanceBoot('splash'), 1800);
      return () => clearTimeout(t);
    }
    if (phase === 'splash') {
      const t = setTimeout(() => advanceBoot('login'), 1600);
      return () => clearTimeout(t);
    }
  }, [phase]);

  if (phase === 'desktop') return null;

  if (phase === 'bios') {
    return (
      <div class="boot-overlay bios-phase" onClick={() => advanceBoot('splash')}>
        <pre class="bios-text">
{`Award Modular BIOS v4.51PG, An Energy Star Ally
Copyright (C) 1984-95, Award Software, Inc.

i486 CPU at 66MHz
Memory Test: 16384K OK

Detecting Primary Master   ... ARNEEME-HDD
Detecting Primary Slave    ... None
Detecting Secondary Master ... CD-ROM
Detecting Secondary Slave  ... None

Starting Windows 95...`}
        </pre>
      </div>
    );
  }

  if (phase === 'splash') {
    return (
      <div class="boot-overlay splash-phase" onClick={() => advanceBoot('login')}>
        <div class="splash-content">
          <div class="splash-logo">
            <span class="splash-flag-r">■</span>
            <span class="splash-flag-g">■</span>
            <span class="splash-flag-b">■</span>
            <span class="splash-flag-y">■</span>
          </div>
          <h1>Microsoft<sup>®</sup></h1>
          <h2>Windows<span class="splash-95">95</span></h2>
          <p class="splash-hint">Starting up...</p>
        </div>
      </div>
    );
  }

  return <LoginDialog />;
}
