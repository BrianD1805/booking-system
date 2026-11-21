// Pure host-classification helper safe for the Next.js Proxy/Edge runtime.
export type TenantHostClassification =
  | { kind: 'legacy' | 'unknown'; host: string }
  | { kind: 'business'; host: string; slug: string };

export function classifyTenantHost(
  rawHost: string | null,
  options?: { enabled?: boolean; local?: boolean }
): TenantHostClassification;
