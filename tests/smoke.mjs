// Røyktest: bygger IKKE selv – forventer at `npm run build` er kjørt.
// Starter `wrangler dev` (samme serveringsvei som produksjon, inkludert
// 404-håndtering), kjører gjennom skrivebordet i Chromium og avslutter
// med exit-kode 1 hvis noe feiler.
//
// Lokalt med forhåndsinstallert Chromium:
//   CHROMIUM_PATH=/path/to/chromium node tests/smoke.mjs
// I CI holder det med `npx playwright-core install chromium` først.

import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const PORT = process.env.SMOKE_PORT ?? '8788';
const BASE = `http://127.0.0.1:${PORT}`;

let failures = 0;
function check(name, ok, detail = '') {
  const mark = ok ? 'ok  ' : 'FAIL';
  console.log(`${mark} ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures++;
}

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server på ${url} svarte ikke innen ${timeoutMs} ms`);
}

const wrangler = spawn('npx', ['wrangler', 'dev', '--port', PORT], {
  stdio: 'ignore',
  detached: true,
});

let browser;
try {
  await waitForServer(BASE);

  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });

  // --- Boot → login → skrivebord ---
  await page.goto(BASE + '/');
  await page.waitForSelector('.desktop-icons', { timeout: 30_000 });
  await page.click('.boot-overlay button[type="submit"]', { timeout: 20_000 });
  await page.waitForSelector('.boot-overlay', { state: 'detached', timeout: 10_000 });
  await page.waitForTimeout(500);
  check('boot-sekvens fullført', true);

  // --- Meta-tagger ---
  const desc = await page.getAttribute('meta[name="description"]', 'content');
  const ogImage = await page.getAttribute('meta[property="og:image"]', 'content');
  const ogUrl = await page.getAttribute('meta[property="og:url"]', 'content');
  check('meta description finnes', !!desc);
  check('og:image finnes', !!ogImage, ogImage ?? '');
  check('og:url finnes', !!ogUrl, ogUrl ?? '');

  // --- Høyreklikkmeny på skrivebordet ---
  await page.mouse.click(1150, 300, { button: 'right' });
  await page.waitForSelector('.desktop-context-menu', { timeout: 3000 });
  await page.click('.desktop-context-menu button:has-text("Nytt notat")');
  await page.waitForSelector('.window', { timeout: 5000 });
  check('kontekstmeny åpner app', true);
  check('kontekstmeny lukkes etter valg', (await page.$('.desktop-context-menu')) === null);

  // Esc lukker menyen
  await page.mouse.click(1150, 500, { button: 'right' });
  await page.waitForSelector('.desktop-context-menu');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check('Esc lukker kontekstmeny', (await page.$('.desktop-context-menu')) === null);

  // --- Dobbeltklikk på tittellinje maksimerer ---
  const topWin = page.locator('.window').last();
  const before = (await topWin.boundingBox()).width;
  await topWin.locator('.title-bar-text').dblclick();
  await page.waitForTimeout(300);
  const after = (await topWin.boundingBox()).width;
  await topWin.locator('.title-bar-text').dblclick();
  await page.waitForTimeout(300);
  check('dblklikk maksimerer/gjenoppretter', after > before, `${before} -> ${after}`);

  // --- Taskbar-høyreklikk: still side om side ---
  await page.click('.taskbar', { button: 'right', position: { x: 400, y: 15 } });
  await page.waitForSelector('.desktop-context-menu', { timeout: 3000 });
  await page.click('.desktop-context-menu button:has-text("side om side")');
  await page.waitForTimeout(300);
  check('taskbar-meny: still side om side', (await page.$('.desktop-context-menu')) === null);

  // --- Minesveiper via Start-menyen ---
  await page.click('.start-button');
  await page.click('.start-menu-item:has-text("Minesveiper")');
  await page.waitForSelector('.mines-grid', { timeout: 5000 });
  await page.click('.mines-grid .mines-cell >> nth=40');
  await page.waitForTimeout(200);
  const revealed = await page.$$eval('.mines-cell.revealed', (els) => els.length);
  check('minesveiper: første klikk avslører ruter', revealed > 0, `${revealed} ruter`);

  // --- 404-side (BSOD) med ekte 404-status ---
  const res = await page.goto(BASE + '/finnes/ikke');
  check('404-status på ukjent sti', res.status() === 404, `status ${res.status()}`);
  const bsod = await page.textContent('.bsod-inner');
  check('BSOD-innhold', bsod.includes('fatal exception'));
  await page.keyboard.press('Enter');
  await page.waitForURL(BASE + '/', { timeout: 5000 });
  check('tastetrykk på 404 går hjem', true);

  // --- Konsollfeil ---
  const realErrors = errors.filter((e) => !e.includes('404') && !e.includes('Failed to load resource'));
  check('ingen konsoll-/sidefeil', realErrors.length === 0, realErrors.join(' | '));
} catch (err) {
  console.error('FAIL (uventet):', err.message);
  failures++;
} finally {
  if (browser) await browser.close().catch(() => {});
  try {
    process.kill(-wrangler.pid, 'SIGTERM');
  } catch {}
}

console.log(failures === 0 ? '\nAlle røyktester besto.' : `\n${failures} sjekk(er) feilet.`);
process.exit(failures === 0 ? 0 : 1);
