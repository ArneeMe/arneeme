// Typer og hjelpere for presentasjoner som også kan brukes i nettleseren.
// Selve listen bygges i registry.ts (kun ved bygging) og hentes av
// skrivebordsappen fra /presentasjoner/liste.json.

export interface Presentasjon {
  /** Brukes i URL-en: /presentasjoner/<slug>/. Avledet fra filnavnet. */
  slug: string;
  tittel: string;
  beskrivelse: string;
  /** ISO-dato, YYYY-MM-DD, eller tom hvis fila ikke oppgir dato. */
  dato: string;
  /** URL til HTML-fila. */
  fil: string;
}

/** Nyeste først, presentasjoner uten dato sist. */
export function sorter(liste: Presentasjon[]): Presentasjon[] {
  return [...liste].sort((a, b) => b.dato.localeCompare(a.dato) || a.tittel.localeCompare(b.tittel, 'nb'));
}

export function formaterDato(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
