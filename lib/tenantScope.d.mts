export type ScopedTenant = { practiceId: string; tenantSlug: string; name: string; host: string; legacy: boolean; publicBookings?: boolean; demoVisitor?: boolean; demoExpiresAt?: string | null };
export function runInTenant<T>(tenant: ScopedTenant, work: () => T): T;
export function currentTenant(): ScopedTenant;
export function isVerifiedDemoRequestContext(now?: number): boolean;
export function classifyTenantHost(host: string | null, options?: {enabled?: boolean; local?: boolean}): {kind:'legacy'|'unknown';host:string}|{kind:'business';host:string;slug:string};
