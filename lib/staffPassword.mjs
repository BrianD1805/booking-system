import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
export function hashStaffPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password,salt,64).toString('hex')}`;
}
export function verifyStaffPassword(id,password,stored) {
  if (typeof password !== 'string' || password.length > 256 || typeof stored !== 'string') return false;
  if (/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(stored)) {
    const [,salt,digest] = stored.split('$');
    return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(digest,'hex'));
  }
  if (!/^[a-f0-9]{64}$/.test(stored)) return false;
  const legacy=createHash('sha256').update(`zipbook-admin-staff-password:${id}:${password}`).digest();
  return timingSafeEqual(legacy,Buffer.from(stored,'hex'));
}
