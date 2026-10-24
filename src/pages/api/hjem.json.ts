import { nrkSiste } from '../../lib/nrkSiste';

export const prerender = false;

export const GET = () => nrkSiste('hjem.json', 'application/json; charset=utf-8');
