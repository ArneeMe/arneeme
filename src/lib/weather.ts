// Værdata fra MET Norge (Locationforecast 2.0 compact).
//
// NB: met.no sin ToS ber om en identifiserende User-Agent, men nettlesere
// kan ikke overstyre den headeren i fetch. Vi kompenserer med aggressiv
// caching (aldri ny forespørsel før Expires), koordinater avkortet til
// 4 desimaler, og synlig attribusjon i appen.

export interface City {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export const CITIES: City[] = [
  { id: 'bergen', name: 'Bergen', lat: 60.3913, lon: 5.3221 },
  { id: 'oslo', name: 'Oslo', lat: 59.9139, lon: 10.7522 },
  { id: 'trondheim', name: 'Trondheim', lat: 63.4305, lon: 10.3951 },
  { id: 'stavanger', name: 'Stavanger', lat: 58.97, lon: 5.7331 },
  { id: 'tromso', name: 'Tromsø', lat: 69.6492, lon: 18.9553 },
];

export interface ForecastPoint {
  time: string;
  temp: number;
  windSpeed: number;
  precipitation: number;
  symbol: string;
}

export interface Forecast {
  updatedAt: number;
  expiresAt: number;
  current: ForecastPoint;
  hours: ForecastPoint[];
}

interface VaerStorage {
  selectedCityId: string;
  cache: Record<string, Forecast>;
}

const STORAGE_KEY = 'arneeme:vaer:v1';
const FALLBACK_TTL_MS = 30 * 60 * 1000;

export function loadStorage(): VaerStorage {
  if (typeof localStorage === 'undefined') return { selectedCityId: 'bergen', cache: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { selectedCityId: 'bergen', cache: {} };
    const parsed = JSON.parse(raw) as Partial<VaerStorage>;
    return {
      selectedCityId: CITIES.some((c) => c.id === parsed.selectedCityId)
        ? (parsed.selectedCityId as string)
        : 'bergen',
      cache: parsed.cache && typeof parsed.cache === 'object' ? (parsed.cache as Record<string, Forecast>) : {},
    };
  } catch {
    return { selectedCityId: 'bergen', cache: {} };
  }
}

function saveStorage(storage: VaerStorage) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch {}
}

export function setSelectedCity(cityId: string) {
  const storage = loadStorage();
  saveStorage({ ...storage, selectedCityId: cityId });
}

export function getCachedForecast(cityId: string): Forecast | null {
  const cached = loadStorage().cache[cityId];
  return cached && typeof cached.updatedAt === 'number' ? cached : null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseResponse(json: any, expiresAt: number): Forecast {
  const series: any[] = json?.properties?.timeseries ?? [];
  const points: ForecastPoint[] = [];
  for (const entry of series) {
    const instant = entry?.data?.instant?.details;
    const next1h = entry?.data?.next_1_hours;
    if (!instant || !next1h) continue;
    points.push({
      time: String(entry.time ?? ''),
      temp: Number(instant.air_temperature ?? 0),
      windSpeed: Number(instant.wind_speed ?? 0),
      precipitation: Number(next1h?.details?.precipitation_amount ?? 0),
      symbol: String(next1h?.summary?.symbol_code ?? ''),
    });
    if (points.length >= 9) break;
  }
  if (points.length === 0) throw new Error('Tomt datasett fra MET');
  return {
    updatedAt: Date.now(),
    expiresAt,
    current: points[0],
    hours: points.slice(1, 9),
  };
}

export async function getForecast(city: City): Promise<Forecast> {
  const cached = getCachedForecast(city.id);
  // ToS: aldri ny forespørsel før Expires — heller ikke ved manuell oppdatering.
  if (cached && Date.now() < cached.expiresAt) {
    return cached;
  }

  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${city.lat}&lon=${city.lon}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MET svarte ${res.status}`);
  const expiresHeader = res.headers.get('Expires');
  const expiresAt = expiresHeader && !Number.isNaN(Date.parse(expiresHeader))
    ? Date.parse(expiresHeader)
    : Date.now() + FALLBACK_TTL_MS;
  const forecast = parseResponse(await res.json(), expiresAt);

  const storage = loadStorage();
  saveStorage({ ...storage, cache: { ...storage.cache, [city.id]: forecast } });
  return forecast;
}

const SYMBOL_EMOJI: Array<[RegExp, string]> = [
  [/thunder/, '⛈️'],
  [/sleet/, '🌨️'],
  [/snow/, '❄️'],
  [/rainshowers/, '🌦️'],
  [/heavyrain/, '🌧️'],
  [/rain/, '🌧️'],
  [/drizzle/, '🌦️'],
  [/fog/, '🌫️'],
  [/clearsky_night/, '🌙'],
  [/clearsky/, '☀️'],
  [/fair/, '🌤️'],
  [/partlycloudy/, '⛅'],
  [/cloudy/, '☁️'],
];

export function symbolToEmoji(code: string): string {
  for (const [re, emoji] of SYMBOL_EMOJI) {
    if (re.test(code)) return emoji;
  }
  return '🌡️';
}
