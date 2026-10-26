// Dagens vær fra yr.no (MET Norway) til lesebrettets hjemskjerm.
// Kjøres hver time av .github/workflows/nyheter.yml  →  ut/hjem.json,
// som arnee.me/api/hjem.json videresender.
//
// Lokalt: cd nyheter && node vaer.mjs

import { mkdir, writeFile } from 'node:fs/promises';

const STED = { navn: 'Oslo', lat: 59.91, lon: 10.75 };
const URL_YR = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${STED.lat}&lon=${STED.lon}`;
// MET krever en User-Agent som sier hvem vi er.
const UA = 'arnee.me-hjem/1.0 https://arnee.me';
const UT = new URL('./ut/', import.meta.url);
const NEDBOR_MM = 0.3; // mindre enn dette i timen regnes som opphold

// yr-symbolkode (f.eks. "partlycloudy_day") → én av ikonene lesebrettet kan tegne.
function ikon(kode = '') {
  if (kode.includes('thunder')) return 'torden';
  if (kode.includes('snow') || kode.includes('sleet')) return 'sno';
  if (kode.includes('rain')) return 'regn';
  if (kode.startsWith('fog')) return 'taake';
  if (kode.startsWith('cloudy')) return 'sky';
  if (kode.startsWith('partlycloudy') || kode.startsWith('fair')) return 'lettsky';
  if (kode.startsWith('clearsky')) return 'sol';
  return 'sky';
}

const osloDato = (d) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
const osloTime = (d) => d.toLocaleTimeString('nb-NO', { timeZone: 'Europe/Oslo', hour: '2-digit' });

const res = await fetch(URL_YR, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20_000) });
if (!res.ok) throw new Error(`yr: HTTP ${res.status}`);
const serie = (await res.json()).properties.timeseries;

const naa = new Date();
const idag = osloDato(naa);
// Timene som er igjen av dagen, fra timen vi er i nå.
const timer = serie.filter((t) => {
  const tid = new Date(t.time);
  return tid > new Date(naa.getTime() - 3600_000) && osloDato(tid) === idag;
});
const forst = timer[0] ?? serie[0];
const temp = (t) => t.data.instant.details.air_temperature;
const temperaturer = (timer.length ? timer : [forst]).map(temp);

// «Regn fra kl 15», «Snø nå» eller «Ikke regn i dag».
let tekst = 'Ikke regn i dag';
for (const t of timer) {
  const neste = t.data.next_1_hours;
  if (!neste || (neste.details?.precipitation_amount ?? 0) < NEDBOR_MM) continue;
  const hva = ikon(neste.summary.symbol_code) === 'sno' ? 'Snø' : 'Regn';
  tekst = t === forst ? `${hva} nå` : `${hva} fra kl ${osloTime(new Date(t.time))}`;
  break;
}

const hjem = {
  bygd: naa.toISOString(),
  sted: STED.navn,
  temp: Math.round(temp(forst)),
  min: Math.round(Math.min(...temperaturer)),
  max: Math.round(Math.max(...temperaturer)),
  ikon: ikon(forst.data.next_1_hours?.summary.symbol_code),
  tekst,
};

await mkdir(UT, { recursive: true });
await writeFile(new URL('hjem.json', UT), JSON.stringify(hjem) + '\n');
console.log(JSON.stringify(hjem));
