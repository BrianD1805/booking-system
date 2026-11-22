import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// Account-scoped, salted, memory-hard hashes; never store a raw password.
export function hashClientPassword(accountId, password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(`${accountId}:${password}`, Buffer.from(salt, 'hex'), 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

// Verified accounts created before Ver-0.063 can still sign in.
// A successful password reset replaces their old SHA-256 hash with scrypt.
export function matchesClientPassword(accountId, password, stored) {
  if (typeof stored !== 'string') return false;
  if (stored.startsWith('scrypt$')) {
    const [algorithm, salt, digest, extra] = stored.split('$');
    if (algorithm !== 'scrypt' || extra !== undefined || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(digest)) return false;
    return timingSafeEqual(
      scryptSync(`${accountId}:${password}`, Buffer.from(salt, 'hex'), 64),
      Buffer.from(digest, 'hex')
    );
  }
  if (!/^[a-f0-9]{64}$/.test(stored)) return false;
  const legacy = createHash('sha256').update(`zipbook-client-password:${accountId}:${password}`).digest('hex');
  return timingSafeEqual(Buffer.from(legacy, 'hex'), Buffer.from(stored, 'hex'));
}
