export type ScopedTenant = { practiceId: string; tenantSlug: string; name: string; host: string; legacy: boolean };
export function runInTenant<T>(tenant: ScopedTenant, work: () => T): T;
export function currentTenant(): ScopedTenant;
export function classifyTenantHost(host: string | null, options?: {enabled?: boolean; local?: boolean}): {kind:'legacy'|'unknown';host:string}|{kind:'business';host:string;slug:string};
