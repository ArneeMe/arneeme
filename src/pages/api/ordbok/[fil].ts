// Ordboka til lesebrettet ligger i GitHub-releasen `ordbok` (se
// .github/workflows/ordbok.yml). Denne ruten sender videre dit.
import type { APIRoute } from 'astro';

export const prerender = false;

const RELEASE = 'https://github.com/ArneeMe/arneeme/releases/download/ordbok/';

export const GET: APIRoute = ({ params }) => {
  const fil = params.fil ?? '';
  if (!/^[\w.-]+$/.test(fil)) return new Response('Ugyldig filnavn', { status: 400 });
  return Response.redirect(RELEASE + fil, 302);
};
