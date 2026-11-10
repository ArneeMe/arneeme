import { readFileSync, writeFileSync } from 'node:fs';

const kilde = process.argv[2];
if (!kilde) {
  console.error('Bruk: node src/bokstavspill/lag-ordliste.mjs <fullformsliste.txt>');
  console.error('Fila ligger i Norsk ordbank bokmål: https://www.nb.no/sprakbanken/ressurskatalog/oai-nb-no-sbr-5/');
  process.exit(1);
}

const ord = new Set();
for (const linje of readFileSync(kilde, 'latin1').split(/\r?\n/).slice(1)) {
  const [, , oppslag, tag] = linje.split('\t');
  if (!oppslag || /\b(prop|fork|symb|pref)\b/.test(tag)) continue;
  if (/^[a-zæøå]{2,9}$/.test(oppslag) && /[aeiouyæøå]/.test(oppslag)) ord.add(oppslag);
}

const liste = [...ord].sort((a, b) => a.localeCompare(b, 'nb'));
writeFileSync(new URL('./ord.txt', import.meta.url), liste.join('\n') + '\n');
console.log(`${liste.length} ord`);
