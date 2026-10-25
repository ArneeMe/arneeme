// Lager en EPUB med alle toppsakene fra NRK, til lesebrettet.
// Kjøres hver time av .github/workflows/nyheter.yml, som legger
// nrk.epub og nrk.json i GitHub-releasen `nrk-siste`.
// arnee.me/api/nrk.epub og /api/nrk.json videresender derfra.
//
// Lokalt: cd nyheter && npm install && npm run build  →  ut/nrk.epub

import { mkdir, writeFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import { Readability } from '@mozilla/readability';
import JSZip from 'jszip';
import sharp from 'sharp';

const RSS = 'https://www.nrk.no/toppsaker.rss';
const UA = 'arnee.me-nyheter/1.0 (personlig lesebrett; https://arnee.me)';
const SAMTIDIG = 4;
const MIN_TEGN = 300; // kortere enn dette er video, liveblogg o.l.
const BILDE_BREDDE = 480; // lesebrettets skjermbredde
const MAKS_ALDER_MS = 36 * 3600_000; // saker som ikke er oppdatert så nylig, tas ikke med
const UT = new URL('./ut/', import.meta.url);

const stille = new VirtualConsole();

async function hent(url) {
  for (let forsok = 1; ; forsok++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (forsok >= 2) throw e;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

function lesRss(xml) {
  const doc = new JSDOM(xml, { contentType: 'text/xml' }).window.document;
  const tekst = (el, tag) => el.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';
  return [...doc.getElementsByTagName('item')].map((item) => ({
    tittel: tekst(item, 'title'),
    lenke: tekst(item, 'link'),
    ingress: tekst(item, 'description'),
    dato: new Date(tekst(item, 'pubDate')),
  }));
}

// --- HTML til gyldig XHTML ---------------------------------------------------

const BEHOLD = new Set(['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'em', 'strong', 'b', 'i', 'br']);
const FJERN = new Set(['script', 'style', 'noscript', 'iframe', 'svg', 'figure', 'img', 'picture', 'video', 'audio', 'button', 'nav', 'form', 'aside', 'footer']);
const SOM = { h1: 'h2', h5: 'h4', h6: 'h4' };

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function xhtml(node) {
  if (node.nodeType === 3) return esc(node.textContent);
  if (node.nodeType !== 1) return '';
  const tag = node.localName;
  if (FJERN.has(tag)) return '';
  const inni = [...node.childNodes].map(xhtml).join('');
  const ny = SOM[tag] ?? tag;
  if (ny === 'br') return '<br/>';
  if (!BEHOLD.has(ny)) return inni; // pakk ut: behold teksten, dropp taggen
  if (!inni.trim()) return '';
  if (ny === 'p' && /^\s*(Publisert|Oppdatert)\b/.test(node.textContent)) return '';
  return `<${ny}>${inni}</${ny}>`;
}

// --- Artikler -----------------------------------------------------------------

// Når artikkelen sist ble oppdatert, fra metadata på siden. null hvis ukjent.
function oppdatert(doc) {
  const kandidater = [
    doc.querySelector('meta[property="article:modified_time"]')?.content,
    doc.querySelector('meta[itemprop="dateModified"]')?.content,
    doc.querySelector('time[itemprop="dateModified"]')?.getAttribute('datetime'),
  ];
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    const m = script.textContent.match(/"dateModified"\s*:\s*"([^"]+)"/);
    if (m) kandidater.push(m[1]);
  }
  const tider = kandidater.map((t) => new Date(t)).filter((d) => !isNaN(d));
  return tider.length ? new Date(Math.max(...tider)) : null;
}

async function lesArtikkel(sak) {
  const url = new URL(sak.lenke);
  if (url.hostname !== 'www.nrk.no') return null; // tv.nrk.no, radio.nrk.no osv.
  const html = await hent(sak.lenke);
  const dom = new JSDOM(html, { url: sak.lenke, virtualConsole: stille });
  try {
    const endret = oppdatert(dom.window.document);
    const bildeUrl = dom.window.document.querySelector('meta[property="og:image"]')?.content ?? '';
    const sist = endret && endret > sak.dato ? endret : sak.dato;
    if (Date.now() - sist > MAKS_ALDER_MS) return null;
    const art = new Readability(dom.window.document).parse();
    if (!art || (art.length ?? 0) < MIN_TEGN) return null;
    const innhold = new JSDOM(`<body>${art.content}</body>`).window.document.body;
    const brodtekst = xhtml(innhold).replace(/(<br\/>\s*){2,}/g, '<br/>');
    return { ...sak, bildeUrl, endret: Boolean(endret), byline: art.byline?.trim() ?? '', brodtekst, tekst: innhold.textContent };
  } finally {
    dom.window.close();
  }
}

// Hovedbildet som gråtone-JPEG for e-blekk. Baseline (ikke progressiv): lesebrettet
// dekoder progressive JPEG bare i 1/8 oppløsning.
async function lagBilde(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`bilde HTTP ${res.status}`);
  return sharp(Buffer.from(await res.arrayBuffer()))
    .resize({ width: BILDE_BREDDE, withoutEnlargement: true })
    .toColourspace('b-w')
    .jpeg({ quality: 70, progressive: false })
    .toBuffer();
}

async function iParallell(liste, n, fn) {
  const svar = new Array(liste.length);
  let neste = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (neste < liste.length) {
        const i = neste++;
        try {
          svar[i] = await fn(liste[i]);
        } catch (e) {
          console.warn(`hoppet over ${liste[i].lenke}: ${e.message}`);
          svar[i] = null;
        }
      }
    }),
  );
  return svar;
}

// --- EPUB ---------------------------------------------------------------------

const oslo = (d, opt) => d.toLocaleString('nb-NO', { timeZone: 'Europe/Oslo', ...opt });
const klokke = (d) => oslo(d, { hour: '2-digit', minute: '2-digit' });

function side(tittel, body) {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="nb" lang="nb">
<head><meta charset="utf-8"/><title>${esc(tittel)}</title><link rel="stylesheet" href="stil.css"/></head>
<body>
${body}
</body>
</html>
`;
}

function artikkelSide(a) {
  const meta = [a.byline, `${oslo(a.dato, { weekday: 'short', day: 'numeric', month: 'short' })} kl ${klokke(a.dato)}`]
    .filter(Boolean)
    .map(esc)
    .join(' · ');
  // Readability tar ofte med ingressen selv. Vis RSS-ingressen bare når den mangler.
  const start = a.tekst.replace(/\s+/g, ' ').trim().slice(0, 300);
  const ingress = a.ingress && !start.includes(a.ingress.slice(0, 60)) ? `<p class="ingress">${esc(a.ingress)}</p>` : '';
  const bilde = a.bildeFil ? `<div class="bilde"><img src="${a.bildeFil}" alt=""/></div>\n` : '';
  return side(a.tittel, `<h1>${esc(a.tittel)}</h1>\n<p class="meta">${meta}</p>\n${bilde}${ingress}\n${a.brodtekst}`);
}

async function lagEpub(tittel, artikler, bygd) {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>
`,
  );

  const filer = artikler.map((a, i) => ({ ...a, fil: `s${String(i + 1).padStart(3, '0')}.xhtml` }));
  const id = `urn:arnee.me:nrk:${bygd.toISOString().slice(0, 13)}`;

  zip.file(
    'OEBPS/stil.css',
    `body { margin: 0 0.5em; }
h1 { font-size: 1.4em; margin: 0.6em 0 0.2em; }
h2 { font-size: 1.15em; }
.meta { font-size: 0.8em; margin: 0 0 1em; }
.ingress { font-weight: bold; }
.bilde { margin: 0 0 1em; text-align: center; }
.bilde img { width: 100%; }
ol.innhold li { margin-bottom: 0.4em; }
`,
  );

  const liste = filer.map((a) => `<li><a href="${a.fil}">${esc(a.tittel)}</a></li>`).join('\n');
  zip.file('OEBPS/forside.xhtml', side(tittel, `<h1>${esc(tittel)}</h1>\n<p class="meta">${artikler.length} saker fra NRK</p>\n<ol class="innhold">\n${liste}\n</ol>`));
  zip.file('OEBPS/nav.xhtml', side('Innhold', `<nav epub:type="toc"><h1>Innhold</h1>\n<ol>\n${liste}\n</ol></nav>`));
  for (const a of filer) {
    if (a.bilde) {
      a.bildeFil = a.fil.replace('.xhtml', '.jpg');
      zip.file(`OEBPS/${a.bildeFil}`, a.bilde, { compression: 'STORE' });
    }
    zip.file(`OEBPS/${a.fil}`, artikkelSide(a));
  }

  const ncxPunkter = filer
    .map((a, i) => `<navPoint id="p${i + 1}" playOrder="${i + 1}"><navLabel><text>${esc(a.tittel)}</text></navLabel><content src="${a.fil}"/></navPoint>`)
    .join('\n');
  zip.file(
    'OEBPS/toc.ncx',
    `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head><meta name="dtb:uid" content="${id}"/></head>
<docTitle><text>${esc(tittel)}</text></docTitle>
<navMap>
${ncxPunkter}
</navMap>
</ncx>
`,
  );

  const manifest = filer
    .flatMap((a) => [
      `<item id="${a.fil.slice(0, 4)}" href="${a.fil}" media-type="application/xhtml+xml"/>`,
      ...(a.bildeFil ? [`<item id="b${a.fil.slice(1, 4)}" href="${a.bildeFil}" media-type="image/jpeg"/>`] : []),
    ])
    .join('\n');
  const spine = filer.map((a) => `<itemref idref="${a.fil.slice(0, 4)}"/>`).join('\n');
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="nb">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="uid">${id}</dc:identifier>
<dc:title>${esc(tittel)}</dc:title>
<dc:creator>NRK</dc:creator>
<dc:language>nb</dc:language>
<meta property="dcterms:modified">${bygd.toISOString().slice(0, 19)}Z</meta>
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
<item id="stil" href="stil.css" media-type="text/css"/>
<item id="forside" href="forside.xhtml" media-type="application/xhtml+xml"/>
${manifest}
</manifest>
<spine toc="ncx">
<itemref idref="forside"/>
${spine}
</spine>
</package>
`,
  );

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', mimeType: 'application/epub+zip' });
}

// --- Main -----------------------------------------------------------------------

const bygd = new Date();
const saker = lesRss(await hent(RSS));
const artikler = (await iParallell(saker, SAMTIDIG, lesArtikkel)).filter(Boolean);
if (artikler.length === 0) throw new Error(`Ingen artikler (${saker.length} i RSS)`);

// Hovedbildene, fire om gangen. En sak uten bilde vises bare uten.
await iParallell(artikler, SAMTIDIG, async (a) => {
  if (!a.bildeUrl) return;
  try {
    a.bilde = await lagBilde(a.bildeUrl);
  } catch (e) {
    console.warn(`uten bilde ${a.lenke}: ${e.message}`);
  }
});

const tittel = `NRK ${oslo(bygd, { weekday: 'short', day: 'numeric', month: 'short' })} kl ${oslo(bygd, { hour: '2-digit' })}`;
const epub = await lagEpub(tittel, artikler, bygd);
// `liste` er overskriftene i samme rekkefølge som kapitlene (kapittel 1 er
// forsiden). `id` er NRKs artikkel-id, som lesebrettet bruker til «lest».
const liste = artikler.map((a) => ({
  id: a.lenke.match(/(\d+\.\d+)$/)?.[1] ?? a.lenke,
  t: a.tittel,
  kl: klokke(a.dato),
}));
const medEndret = artikler.filter((a) => a.endret).length;
const medBilde = artikler.filter((a) => a.bilde).length;
const info = { tittel, bygd: bygd.toISOString(), saker: artikler.length, iRss: saker.length, medEndret, medBilde, bytes: epub.length, liste };

await mkdir(UT, { recursive: true });
await writeFile(new URL('nrk.epub', UT), epub);
await writeFile(new URL('nrk.json', UT), JSON.stringify(info) + '\n');
console.log(JSON.stringify({ ...info, liste: undefined }));
