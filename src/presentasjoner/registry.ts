// Register over presentasjoner som hostes på /presentasjoner.
//
// Presentasjonene lages utenfor plattformen som selvstendige HTML-filer og
// legges i public/presentasjoner/filer/. Legg til en oppføring her for å få
// dem på oversikten og en egen URL: /presentasjoner/<slug>.
//
// `kilde` er en union slik at en senere editor kan lagre presentasjoner i et
// annet format (f.eks. { type: 'dokument', ... }) uten at resten av modellen
// eller URL-ene må endres.

export type PresentasjonKilde = { type: 'html'; fil: string };

export interface Presentasjon {
  /** Brukes i URL-en. Kun a-z, 0-9 og bindestrek. «filer» er reservert. */
  slug: string;
  tittel: string;
  beskrivelse: string;
  /** ISO-dato, YYYY-MM-DD. */
  dato: string;
  kilde: PresentasjonKilde;
}

export const presentasjoner: Presentasjon[] = [
  {
    slug: 'eksempel',
    tittel: 'Eksempelpresentasjon',
    beskrivelse:
      'Plassholderinnhold som viser lineære slides, en spørsmålshub med «håndtert»-status og navigering mellom dem.',
    dato: '2026-10-11',
    kilde: { type: 'html', fil: '/presentasjoner/filer/eksempel.html' },
  },
];

/** Nyeste først. */
export function sortertePresentasjoner(): Presentasjon[] {
  return [...presentasjoner].sort((a, b) => b.dato.localeCompare(a.dato));
}

export function kildeUrl(p: Presentasjon): string {
  return p.kilde.fil;
}

export function formaterDato(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
