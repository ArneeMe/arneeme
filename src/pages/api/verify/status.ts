import type { APIRoute } from 'astro';
import { ZKPassport } from '@zkpassport/sdk';
import { pendingVerifications } from '../../../lib/verify-state';

export const GET: APIRoute = async ({ request, cookies }) => {
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get('requestId');

  if (!requestId) {
    return Response.json({ status: 'error', message: 'Missing requestId' }, { status: 400 });
  }

  const entry = pendingVerifications.get(requestId);

  if (!entry) {
    return Response.json({ status: 'expired' }, { status: 404 });
  }

  if (Date.now() > entry.expiresAt) {
    pendingVerifications.delete(requestId);
    return Response.json({ status: 'expired' }, { status: 404 });
  }

  if (entry.failed) {
    pendingVerifications.delete(requestId);
    return Response.json({ status: 'failed', verified: false });
  }

  if (!entry.result) {
    return Response.json({ status: 'pending' });
  }

  // Result arrived — verify server-side using independently constructed originalQuery.
  const zkpassport = new ZKPassport('arnee.me');
  const { query: originalQuery } = zkpassport.createQuery().gte('age', 16).done();

  const { verified, uniqueIdentifier } = await zkpassport.verify({
    proofs: entry.proofs,
    originalQuery,
    queryResult: entry.result.queryResult,
    scope: '16-plus',
    devMode: entry.devMode,
  });

  pendingVerifications.delete(requestId);

  if (!verified) {
    return Response.json({ status: 'failed', verified: false });
  }

  cookies.set('age_verified', '1', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 86400,
    path: '/',
  });

  return Response.json({ status: 'verified', verified: true });
};
