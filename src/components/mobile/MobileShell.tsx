import { useState } from 'preact/hooks';
import { StartScreen } from './StartScreen';
import { MobileAppView } from './MobileAppView';

/**
 * Windows-Phone-style mobile shell. Shown instead of the Win95 desktop on
 * phone-sized screens. A flat Metro tile Start screen; tapping a tile mounts
 * the existing app component full-screen. Only one app open at a time.
 */
export function MobileShell() {
  const [openAppId, setOpenAppId] = useState<string | null>(null);

  return (
    <div class="metro">
      {openAppId ? (
        <MobileAppView appId={openAppId} onBack={() => setOpenAppId(null)} />
      ) : (
        <StartScreen onOpenApp={setOpenAppId} />
      )}
    </div>
  );
}
