import { useState, useEffect } from 'preact/hooks';
import { closeWindow } from '../../../stores/desktop';
import { MenuBar } from '../MenuBar';
import {
  CITIES,
  getForecast,
  getCachedForecast,
  loadStorage,
  setSelectedCity,
  symbolToEmoji,
  type Forecast,
} from '../../../lib/weather';

interface Props {
  instanceId: string;
}

const num = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 });

function clock(ts: number | string): string {
  return new Date(ts).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

export default function Vaer({ instanceId }: Props) {
  const [cityId, setCityId] = useState(() => loadStorage().selectedCityId);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'stale' | 'error'>('loading');
  const [reloadToken, setReloadToken] = useState(0);

  const city = CITIES.find((c) => c.id === cityId) ?? CITIES[0];

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    getForecast(city)
      .then((f) => {
        if (cancelled) return;
        setForecast(f);
        setStatus('ok');
      })
      .catch(() => {
        if (cancelled) return;
        const cached = getCachedForecast(city.id);
        if (cached) {
          setForecast(cached);
          setStatus('stale');
        } else {
          setForecast(null);
          setStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cityId, reloadToken]);

  const selectCity = (id: string) => {
    setCityId(id);
    setSelectedCity(id);
  };

  const menus = [
    {
      label: 'Fil',
      items: [
        { label: 'Oppdater', onClick: () => setReloadToken((t) => t + 1) },
        { label: 'Avslutt', onClick: () => closeWindow(instanceId) },
      ],
    },
    {
      label: 'Hjelp',
      items: [
        {
          label: 'Om Vær...',
          onClick: () =>
            alert('Vær for Windows 95\n\nVærdata fra MET Norge (api.met.no),\nlisensiert under NLOD/CC BY 4.0.'),
        },
      ],
    },
  ];

  return (
    <div class="vaer-app">
      <MenuBar menus={menus} />

      <div class="vaer-toolbar">
        <label for="vaer-city">Sted:</label>
        <select
          id="vaer-city"
          value={cityId}
          onChange={(e) => selectCity((e.target as HTMLSelectElement).value)}
        >
          {CITIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {status === 'stale' && forecast && (
        <div class="vaer-warning">
          Kunne ikke oppdatere. Viser data fra {clock(forecast.updatedAt)}.
        </div>
      )}

      {status === 'loading' && !forecast && <div class="vaer-message">Henter værdata...</div>}

      {status === 'error' && (
        <div class="vaer-message">
          <p>Kunne ikke hente værdata.</p>
          <button onClick={() => setReloadToken((t) => t + 1)}>Prøv igjen</button>
        </div>
      )}

      {forecast && status !== 'error' && (
        <div class="vaer-body">
          <div class="vaer-current">
            <span class="vaer-current-emoji">{symbolToEmoji(forecast.current.symbol)}</span>
            <div class="vaer-current-details">
              <div class="vaer-current-temp">{num.format(forecast.current.temp)} °C</div>
              <div>Vind: {num.format(forecast.current.windSpeed)} m/s</div>
              <div>Nedbør: {num.format(forecast.current.precipitation)} mm</div>
            </div>
          </div>

          <div class="vaer-hours">
            {forecast.hours.map((h) => (
              <div key={h.time} class="vaer-hour">
                <div class="vaer-hour-time">{clock(h.time)}</div>
                <div class="vaer-hour-emoji">{symbolToEmoji(h.symbol)}</div>
                <div class="vaer-hour-temp">{num.format(h.temp)}°</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div class="vaer-statusbar">
        {forecast ? `Oppdatert ${clock(forecast.updatedAt)} · ` : ''}Data fra MET Norge
      </div>
    </div>
  );
}
