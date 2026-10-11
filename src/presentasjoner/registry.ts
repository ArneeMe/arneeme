// Presentasjonene som hostes på /presentasjoner, funnet automatisk ved bygging.
//
// Legg en selvstendig HTML-fil i public/presentasjoner/filer/, så får den en
// plass på oversikten og en egen URL: /presentasjoner/<slug>/, der slug er
// filnavnet i små bokstaver uten .html. Metadata leses fra fila selv:
//
//   <title>Tittel</title>
//   <meta name="description" content="Kort beskrivelse" />
//   <meta name="dato" content="2026-10-11" />
//
// Test en fil før den committes på /presentasjoner/forhandsvis/.
//
// Denne modulen leser filene med import.meta.glob og må bare importeres fra
// kode som kjører ved bygging, ikke fra komponenter i nettleseren.

import { sorter, type Presentasjon } from './felles';

export { formaterDato, type Presentasjon } from './felles';

const filer = import.meta.glob<string>('/public/presentasjoner/filer/*.{html,htm}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Sider under /presentasjoner/ som ikke kan brukes som slug. */
const RESERVERT = new Set(['filer', 'forhandsvis', 'liste.json']);

const ENTITETER: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '' };
const dekod = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITETER[n.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();

function tittelFra(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? dekod(m[1]) : '';
}

function metaFra(html: string, navn: string): string {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attr = (a: string) => tag.match(new RegExp(`\\b${a}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
    const n = attr('name');
    if (n && (n[1] ?? n[2]).toLowerCase() === navn) {
      const c = attr('content');
      return c ? dekod(c[1] ?? c[2]) : '';
    }
  }
  return '';
}

function slugFra(filnavn: string): string {
  return filnavn
    .replace(/\.html?$/i, '')
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function bygg(): Presentasjon[] {
  const liste: Presentasjon[] = [];
  const sett = new Map<string, string>();
  for (const [sti, html] of Object.entries(filer)) {
    const filnavn = sti.split('/').pop()!;
    const slug = slugFra(filnavn);
    if (!slug || RESERVERT.has(slug)) {
      throw new Error(`Presentasjoner: «${filnavn}» gir ugyldig eller reservert URL «${slug}». Gi fila et annet navn.`);
    }
    if (sett.has(slug)) {
      throw new Error(`Presentasjoner: «${filnavn}» og «${sett.get(slug)}» gir samme URL «${slug}». Gi en av dem et annet navn.`);
    }
    sett.set(slug, filnavn);

    let dato = metaFra(html, 'dato');
    if (dato && !/^\d{4}-\d{2}-\d{2}$/.test(dato)) {
      console.warn(`Presentasjoner: «${filnavn}» har dato «${dato}», forventet YYYY-MM-DD. Ignoreres.`);
      dato = '';
    }

    liste.push({
      slug,
      tittel: tittelFra(html) || slug,
      beskrivelse: metaFra(html, 'description'),
      dato,
      fil: `/presentasjoner/filer/${encodeURIComponent(filnavn)}`,
    });
  }
  return sorter(liste);
}

/** Alle presentasjoner, nyeste først. */
export const presentasjoner: Presentasjon[] = bygg();
