import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
export const PLATFORM_SESSION_SECONDS = 5 * 60 * 60;
export const PLATFORM_SESSION_COOKIE = 'zipbook_platform_session';
const validKey = key => typeof key === 'string' && /^[a-f0-9]{64}$/i.test(key);
const signature = (key, payload) => createHmac('sha256', Buffer.from(key,'hex')).update('zipbook-platform-session-v1:'+payload).digest('hex');
export function issuePlatformSession(key, now = Date.now()) {
  if (!validKey(key)) throw new Error('Platform key is not configured.');
  const expiresAt = now + PLATFORM_SESSION_SECONDS * 1000;
  const payload = `${expiresAt}.${randomBytes(24).toString('hex')}`;
  return {token: `${payload}.${signature(key,payload)}`, expiresAt};
}
export function platformSessionExpiry(key, token, now = Date.now()) {
  if (!validKey(key) || typeof token !== 'string' || !/^\d{13}\.\w{48}\.[a-f0-9]{64}$/.test(token)) return null;
  const [expiry, nonce, mac] = token.split('.');
  const expiresAt = Number(expiry);
  if (expiresAt <= now || expiresAt > now + PLATFORM_SESSION_SECONDS * 1000) return null;
  return timingSafeEqual(Buffer.from(mac,'hex'),Buffer.from(signature(key,`${expiry}.${nonce}`),'hex')) ? expiresAt : null;
}
