import type { APIRoute } from 'astro';
import { ZKPassport } from '@zkpassport/sdk';
import type { ProofResult } from '@zkpassport/sdk';
import QRCode from 'qrcode';
import { pendingVerifications, cleanupExpired } from '../../../lib/verify-state';

export const POST: APIRoute = async () => {
  cleanupExpired();

  const devMode = import.meta.env.ZKPASSPORT_DEV_MODE === 'true';
  const zkpassport = new ZKPassport('arnee.me');

  const builder = await zkpassport.request({
    name: 'arnee.me',
    logo: 'https://arnee.me/profile.png',
    purpose: 'Aldersbegrensning (over 16 år)',
    scope: '16-plus',
    devMode,
  });

  const { url, requestId, query, onResult, onProofGenerated, onError } = builder
    .gte('age', 16)
    .done();

  const proofs: ProofResult[] = [];

  onProofGenerated((proof) => {
    proofs.push(proof);
  });

  onResult(({ result, uniqueIdentifier }) => {
    const entry = pendingVerifications.get(requestId);
    if (entry) {
      entry.result = { queryResult: result, uniqueIdentifier };
    }
  });

  onError(() => {
    const entry = pendingVerifications.get(requestId);
    if (entry) entry.failed = true;
  });

  pendingVerifications.set(requestId, {
    query,
    proofs,
    devMode,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  const qrDataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 });

  return Response.json({ requestId, qrDataUrl, deepLink: url });
};
