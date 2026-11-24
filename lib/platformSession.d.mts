export const PLATFORM_SESSION_SECONDS: number;
export const PLATFORM_SESSION_COOKIE: string;
export function issuePlatformSession(key: string | undefined, now?: number): { token: string; expiresAt: number };
export function platformSessionExpiry(key: string | undefined, token: string | undefined, now?: number): number | null;
