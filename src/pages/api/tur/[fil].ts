// Veier, stier og høyde til Tur-appen ligger i GitHub-releasen `turdata` (se
// .github/workflows/turdata.yml). Denne ruten sender videre dit.
import type { APIRoute } from 'astro';

export const prerender = false;

const RELEASE = 'https://github.com/ArneeMe/arneeme/releases/download/turdata/';

export const GET: APIRoute = ({ params }) => {
  const fil = params.fil ?? '';
  if (!/^[\w.-]+$/.test(fil)) return new Response('Ugyldig filnavn', { status: 400 });
  return Response.redirect(RELEASE + fil, 302);
};
