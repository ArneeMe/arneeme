// Videresender siste NRK-utgave (bygd av .github/workflows/nyheter.yml)
// fra GitHub-releasen, så lesebrettet bare snakker med arnee.me.
const RELEASE = 'https://github.com/ArneeMe/arneeme/releases/download/nrk-siste/';

export async function nrkSiste(fil: string, type: string): Promise<Response> {
  const res = await fetch(RELEASE + fil, { cf: { cacheTtl: 60, cacheEverything: true } } as RequestInit);
  if (!res.ok) return new Response('Ingen utgave ennå', { status: 502 });
  return new Response(res.body, {
    headers: { 'Content-Type': type, 'Cache-Control': 'no-store' },
  });
}
