import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ cookies }) => {
  const verified = cookies.get('age_verified')?.value === '1';
  return Response.json({ verified });
};
