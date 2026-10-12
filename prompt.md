# Prompt: lag en presentasjon til arnee.me

Kopier alt under streken inn til AI-en, og fyll inn innholdet nederst.

---

Lag en presentasjon som **én selvstendig HTML-fil**. Den skal publiseres på arnee.me/presentasjoner. Følg kravene under nøyaktig. Svar med hele fila og ingenting annet.

## Fil og metadata

- Én `.html`-fil med all CSS og JS inline. **Ingen eksterne ressurser**: ingen CDN-er, webfonter, bilder eller skript fra andre domener. Bilder og ikoner lages som inline SVG eller data-URI-er.
- Foreslå et filnavn med bare små bokstaver, tall og bindestrek, for eksempel `kickoff-q4.html`. Filnavnet blir URL-en.
- `<head>` må ha disse taggene, for det er dem oversikten leser:
  ```html
  <html lang="nb">
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kort tittel</title>
  <meta name="description" content="Én eller to setninger om hva presentasjonen handler om." />
  <meta name="dato" content="YYYY-MM-DD" />
  ```

## Hvordan den vises

- Fila vises i en iframe som fyller hele vinduet. Over den ligger en liten verktøylinje **øverst til venstre** som skjuler seg selv. Ikke legg viktige knapper eller tekst der, omtrent 400 × 50 px.
- Den må fungere på 16:9-projektor, på laptop og på mobil. Bruk `clamp()` og `vw`/`vh` på størrelser, og la ingenting ha fast pikselbredde.
- Tastetrykk kan komme som syntetiske `keydown`-hendelser. Lytt derfor med `document.addEventListener('keydown', …)`. Ikke lytt på enkeltelementer, og ikke bruk `keypress`.

## Tastatur og navigering

| Tast | Handling |
| --- | --- |
| → ↓ mellomrom PageDown | Neste slide |
| ← ↑ PageUp | Forrige slide |
| Home / End | Første / siste slide |
| Backspace | Tilbake (for eksempel fra et spørsmål til oversikten) |
| F | Fullskjerm av/på (`document.documentElement.requestFullscreen()`) |

- **Ikke bruk Esc til noe.** I fullskjerm avslutter nettleseren fullskjerm på Esc, og hendelsen når aldri siden.
- Klikk på en slide går til neste, men ikke når man klikker på knapper eller lenker.
- Vis en diskret fremdriftsindikator, for eksempel `3 / 12`.

## Tilstand

- Lagre hvor man er (slide, visning, avkrysninger) i `localStorage` under nøkkelen `presentasjon:<filnavn-uten-.html>:v1`, slik at en ny innlasting fortsetter der man var.
- Pakk alle `localStorage`-kall i `try/catch`.

## Spørsmålsdel (valgfri, ta med hvis innholdet har spørsmål)

- En egen visning med kort, ett per spørsmål. Den åpnes med tasten H og med en knapp på siste slide. P går tilbake til slidene.
- Klikk på et kort åpner spørsmålet på en egen side. Backspace og en «← Tilbake»-knapp går tilbake.
- Hvert spørsmål kan markeres som **håndtert**, både med en knapp på kortet i oversikten og inne på spørsmålssiden. Håndterte kort ser tydelig annerledes ut. Oversikten viser «X av Y håndtert» og har en «Nullstill»-knapp som ber om bekreftelse.

## Stil

Presentasjonen skal ikke se ut som en typisk AI-generert mal. Unngå:

- gradienter, «glass»-effekter, glødende skygger og fargeklatter i bakgrunnen
- emojier som ikoner, og ikoner pyntet på hver overskrift
- rutenett med tre like kort på alle slides
- avrundede «chips» og badges overalt
- generiske overskrifter som «Nøkkelinnsikt» eller «Veien videre»

Gjør heller dette:

- Ha én tydelig idé per slide og maks rundt 30 ord tekst. Store overskrifter og mye luft.
- Bruk ett aksentfarge, ellers svart, hvit og grå. Bruk systemfont (`system-ui`) eller en serif-stack.
- Skap variasjon ved hjelp av layout: et stort tall, et sitat, en sammenligning i to kolonner, en enkel inline-SVG-graf.
- [Valgfritt: beskriv din egen stil her, for eksempel farger, stemning eller referanser.]

## Sjekk før du svarer

- [ ] Ingen eksterne URL-er i `src`, `href` eller CSS.
- [ ] `<title>`, `description` og `dato` er satt.
- [ ] Esc brukes ikke. Backspace går tilbake.
- [ ] Ingen viktige elementer øverst til venstre.
- [ ] Fungerer på smal mobilskjerm uten horisontal scroll.
- [ ] Tilstanden overlever en ny innlasting.

## Innhold

[LIM INN INNHOLDET HER: tema, publikum, varighet, stikkord per slide og eventuelle spørsmål.]
