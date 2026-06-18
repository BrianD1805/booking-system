export const DEFAULT_PRACTICE_ID = process.env.ZIPBOOK_DEFAULT_PRACTICE_ID || 'practice_001';
export const DEFAULT_TENANT_SLUG = process.env.ZIPBOOK_DEFAULT_TENANT_SLUG || 'zippy-dental-demo';

export type TenantSurface = 'landing' | 'client' | 'admin' | 'widget' | 'unknown';

export type TenantContext = {
  practiceId: string;
  tenantSlug: string;
  surface: TenantSurface;
  host: string;
  pathname: string;
};

export function cleanTenantSlug(value?: string | null) {
  return (value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getDefaultPracticeId() {
  return DEFAULT_PRACTICE_ID;
}

export function resolveTenantContext(input: { host?: string | null; pathname?: string | null }): TenantContext {
  const host = (input.host || '').split(':')[0].toLowerCase();
  const pathname = input.pathname || '/';
  const pathParts = pathname.split('/').filter(Boolean);

  let surface: TenantSurface = 'landing';
  if (pathParts[0] === 'book') surface = 'client';
  if (pathParts[0] === 'admin') surface = 'admin';
  if (pathParts[0] === 'widget') surface = 'widget';
  if (host.startsWith('admin.')) surface = 'admin';

  // Future SaaS routing hook:
  // /book/<tenant-slug> can later resolve a tenant-specific practice.
  // For the current demo, all routes deliberately resolve to practice_001.
  const possibleSlug = pathParts[0] === 'book' ? cleanTenantSlug(pathParts[1]) : '';

  return {
    practiceId: DEFAULT_PRACTICE_ID,
    tenantSlug: possibleSlug || DEFAULT_TENANT_SLUG,
    surface,
    host,
    pathname
  };
}
