// Fastvare til lesebrettet og mesh-enhetene (WaddleOS «Oppdater fastvare»). Henter fra
// waddle-latest-releasen i ArneeMe/waddleos og sender videre, så lesebrettet
// bare snakker med arnee.me.
import type { APIRoute } from 'astro';

export const prerender = false;

const RELEASE = 'https://github.com/ArneeMe/waddleos/releases/download/waddle-latest/';
const TYPER: Record<string, string> = {
  'version.json': 'application/json; charset=utf-8',
  'waddleos-x4pro.bin': 'application/octet-stream',
  'waddleos-t5.bin': 'application/octet-stream',
};

export const GET: APIRoute = async ({ params }) => {
  const fil = params.fil ?? '';
  const type = TYPER[fil];
  if (!type) return new Response('Ukjent fil', { status: 404 });
  const res = await fetch(RELEASE + fil, { headers: { 'User-Agent': 'arnee.me' } });
  if (!res.ok || !res.body) return new Response('Ikke tilgjengelig', { status: 502 });
  const headers: Record<string, string> = { 'Content-Type': type, 'Cache-Control': 'no-store' };
  const lengde = res.headers.get('Content-Length');
  if (lengde) headers['Content-Length'] = lengde;
  return new Response(res.body, { headers });
};
