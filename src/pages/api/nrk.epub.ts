import { nrkSiste } from '../../lib/nrkSiste';

export const prerender = false;

export const GET = () => nrkSiste('nrk.epub', 'application/epub+zip');
