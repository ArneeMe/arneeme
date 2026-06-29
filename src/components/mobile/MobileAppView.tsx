import { apps } from '../../apps/registry';

interface Props {
  appId: string;
  onBack: () => void;
}

export function MobileAppView({ appId, onBack }: Props) {
  const app = apps[appId];
  if (!app) {
    onBack();
    return null;
  }

  const AppComponent = app.component;

  return (
    <div class="metro-appview">
      <header class="metro-appbar">
        <button
          type="button"
          class="metro-back"
          aria-label="Tilbake"
          onClick={onBack}
        >
          ←
        </button>
        <span class="metro-apptitle">{app.title}</span>
      </header>

      <main class="metro-appbody">
        <AppComponent instanceId="mobile" {...(app.props ?? {})} />
      </main>
    </div>
  );
}
