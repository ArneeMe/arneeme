import type { Query, ProofResult, QueryResult } from '@zkpassport/sdk';

export interface PendingVerification {
  query: Query;
  proofs: ProofResult[];
  devMode: boolean;
  result?: {
    queryResult: QueryResult;
    uniqueIdentifier: string | undefined;
  };
  failed?: boolean;
  expiresAt: number;
}

// In-memory state: works in astro dev (single Node.js process).
// Production Cloudflare Workers: replace with a KV binding.
export const pendingVerifications = new Map<string, PendingVerification>();

export function cleanupExpired(): void {
  const now = Date.now();
  for (const [id, entry] of pendingVerifications) {
    if (entry.expiresAt < now) pendingVerifications.delete(id);
  }
}
