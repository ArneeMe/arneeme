import { useEffect } from 'preact/hooks';
import { bootPhase, advanceBoot } from '../../stores/boot';
import { LoginDialog } from './LoginDialog';

export function BootScreen() {
  const phase = bootPhase.value;

  useEffect(() => {
    if (phase === 'splash') {
      const t = setTimeout(() => advanceBoot('login'), 2000);
      return () => clearTimeout(t);
    }
  }, [phase]);

  if (phase === 'desktop') return null;

  if (phase === 'login') return <LoginDialog />;

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
        <p class="splash-hint">Click anywhere to continue</p>
      </div>
    </div>
  );
}
