import { useState } from 'preact/hooks';
import { closeWindow } from '../../../stores/desktop';
import {
  displaySettings,
  updateDisplay,
  previewScreensaver,
  PATTERN_CSS,
  type DisplaySettings,
  type PatternId,
} from '../../../stores/display';

interface Props {
  instanceId: string;
}

// Classic VGA 16-color palette.
const SWATCHES = [
  '#000000', '#800000', '#008000', '#808000',
  '#000080', '#800080', '#008080', '#808080',
  '#c0c0c0', '#ff0000', '#00ff00', '#ffff00',
  '#0000ff', '#ff00ff', '#00ffff', '#ffffff',
];

const PATTERN_LABELS: Record<PatternId, string> = {
  none: 'Ingen',
  dots: 'Prikker',
  diagonal: 'Diagonal',
  grid: 'Rutenett',
  weave: 'Vev',
};

const TIMEOUT_OPTIONS = [1, 2, 5, 10, 15];

export default function DisplayProperties({ instanceId }: Props) {
  const [tab, setTab] = useState<'bakgrunn' | 'skjermsparer'>('bakgrunn');
  const [draft, setDraft] = useState<DisplaySettings>(() => ({
    ...displaySettings.value,
    screensaver: { ...displaySettings.value.screensaver },
  }));

  const apply = () => updateDisplay(draft);
  const ok = () => {
    apply();
    closeWindow(instanceId);
  };

  const pat = PATTERN_CSS[draft.pattern];

  return (
    <div class="display-app">
      <menu role="tablist">
        <li role="tab" aria-selected={tab === 'bakgrunn'}>
          <a href="#bakgrunn" onClick={(e) => { e.preventDefault(); setTab('bakgrunn'); }}>
            Bakgrunn
          </a>
        </li>
        <li role="tab" aria-selected={tab === 'skjermsparer'}>
          <a href="#skjermsparer" onClick={(e) => { e.preventDefault(); setTab('skjermsparer'); }}>
            Skjermsparer
          </a>
        </li>
      </menu>

      <div class="window" role="tabpanel">
        <div class="display-panel">
          <div class="display-monitor">
            <div
              class="display-monitor-screen"
              style={{
                backgroundColor: draft.bgColor,
                backgroundImage: pat.image,
                backgroundSize: pat.size,
              }}
            >
              {tab === 'skjermsparer' && draft.screensaver.enabled && (
                <span class="display-monitor-stars">✦ ✧ ✦</span>
              )}
            </div>
            <div class="display-monitor-stand" />
          </div>

          {tab === 'bakgrunn' ? (
            <>
              <div class="field-row-stacked">
                <label>Farge:</label>
                <div class="display-swatches">
                  {SWATCHES.map((c) => (
                    <button
                      key={c}
                      class={`display-swatch${draft.bgColor === c ? ' selected' : ''}`}
                      style={{ backgroundColor: c }}
                      title={c}
                      onClick={() => setDraft((d) => ({ ...d, bgColor: c }))}
                    />
                  ))}
                </div>
              </div>
              <div class="field-row">
                <label for="display-pattern">Mønster:</label>
                <select
                  id="display-pattern"
                  value={draft.pattern}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      pattern: (e.target as HTMLSelectElement).value as PatternId,
                    }))
                  }
                >
                  {(Object.keys(PATTERN_LABELS) as PatternId[]).map((id) => (
                    <option key={id} value={id}>
                      {PATTERN_LABELS[id]}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div class="field-row">
                <input
                  type="checkbox"
                  id="display-ss-enabled"
                  checked={draft.screensaver.enabled}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      screensaver: {
                        ...d.screensaver,
                        enabled: (e.target as HTMLInputElement).checked,
                      },
                    }))
                  }
                />
                <label for="display-ss-enabled">Aktiver skjermsparer (Stjernehimmel)</label>
              </div>
              <div class="field-row">
                <label for="display-ss-timeout">Vent:</label>
                <select
                  id="display-ss-timeout"
                  disabled={!draft.screensaver.enabled}
                  value={draft.screensaver.timeoutMin}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      screensaver: {
                        ...d.screensaver,
                        timeoutMin: parseInt((e.target as HTMLSelectElement).value, 10),
                      },
                    }))
                  }
                >
                  {TIMEOUT_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} {m === 1 ? 'minutt' : 'minutter'}
                    </option>
                  ))}
                </select>
                <button
                  disabled={!draft.screensaver.enabled}
                  onClick={() => {
                    previewScreensaver.value = true;
                  }}
                >
                  Forhåndsvis
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div class="display-actions">
        <button onClick={ok}>OK</button>
        <button onClick={() => closeWindow(instanceId)}>Avbryt</button>
        <button onClick={apply}>Bruk</button>
      </div>
    </div>
  );
}
