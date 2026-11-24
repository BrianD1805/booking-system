import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { hashClientPassword, matchesClientPassword } from '../lib/clientPassword.mjs';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('business /book displays existing account popup without changing locked home layout', () => {
  const page = read('app/book/page.tsx');
  assert.match(page, /className="client-home-topbar"/);
  assert.match(page, /className="client-login-icon-button"/);
  assert.doesNotMatch(page, /businessInfo\?\.legacy === false \? null : <button/);
  assert.match(page, /client-auth-popup/);
  assert.match(page, /className=\{`auth-header-toggle/);
  assert.match(page, /Book as a guest or sign in to manage your appointments/);
});

test('tenant hostname remains authoritative and SaaS customers use only verified signup/password routes', () => {
  const tenant = read('lib/tenantRequest.ts');
  assert.match(tenant, /classifyTenantHost\(request.headers.get\('host'\)/);
  assert.match(tenant, /lookupTenant\(host.kind === 'legacy'/);
  assert.match(tenant, /if\(isRealDemoTenant\(\)\)/);
  assert.match(tenant, /path.startsWith\('\/api\/client-login\/'\)/);
  assert.match(tenant, /path === '\/api\/client-login\/request-code'/);
  assert.match(tenant, /path === '\/api\/client-login\/verify'/);
  const routes = ['login', 'session', 'sign-up/request-code', 'sign-up/verify', 'password-reset/request-code','password-reset/confirm', 'bookings/[id]', 'logout'];
  for (const part of routes) assert.match(read(`app/api/client-login/${part}/route.ts`), /withTenantRequest\(request/);
});

test('SaaS signup never automatically joins a guest booking to an unverified phone', () => {
  const db = read('lib/db.ts');
  assert.match(db, /createUnlinkedSaasClientCustomer\(phone, email, fullName\)/);
  assert.match(db, /if \(existingAccount && normaliseEmail\(existingAccount.login_email\) !== email\)/);
  assert.match(db, /if \(existingAccount\?\.verified_at\)/);
  assert.match(db, /WHERE practice_id = \$\{currentTenant\(\)\.practiceId\} AND login_phone = \$\{phone\}/);
  assert.match(db, /WHERE b.practice_id = \$\{currentTenant\(\)\.practiceId\} AND b.customer_id = \$\{customerId\}/);
  assert.match(read('app/api/bookings/route.ts'), /if \(customerId && customerId !== authenticatedId\)/);
  assert.match(read('app/api/bookings/route.ts'), /else if \(customerId\)/);
});

test('strong password storage, legacy login migration, and rate limiting', () => {
  const db = read('lib/db.ts');
  assert.match(read('lib/clientPassword.mjs'), /scryptSync\(/);
  assert.match(read('lib/clientPassword.mjs'), /timingSafeEqual\(/);
  assert.match(db, /const minimum = 8/);
  assert.match(db, /matchesClientPassword\(account.id, password, account.password_hash\)/);
  assert.match(db, /if \(!account.password_hash.startsWith\('scrypt\$'\)\)/);
  assert.match(db, /recordClientAuthAttempt\(`login:\$\{phone\}`, 8/);
  assert.match(db, /recordClientAuthAttempt\(`signup:\$\{phone\}`, 5/);
  assert.match(db, /recordClientAuthAttempt\(`reset:\$\{phone\}`, 5/);
  assert.match(db, /ON CONFLICT \(practice_id, fingerprint\) DO UPDATE/);
  const sql = read('supabase/zipbook_customer_accounts_ver_0_063.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public.zipbook_client_auth_limits/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /AS RESTRICTIVE FOR ALL TO zipbook_tenant_runtime/);
  assert.match(sql, /practice_id = nullif\(current_setting\('zipbook.practice_id'/);
  assert.doesNotMatch(sql, /DISABLE ROW LEVEL SECURITY|BYPASSRLS/);
});

test('signup/reset OTPs are consumed once and client logout revokes server session', () => {
  const db = read('lib/db.ts');
  assert.match(db, /consumed_at IS NULL AND attempts < 5 AND expires_at > NOW\(\)/);
  assert.match(db, /RETURNING id\n  `;\n  if \(!consumed\[0\]\)/);
  assert.match(db, /export async function revokeClientSession/);
  assert.match(db, /UPDATE client_sessions SET revoked_at = NOW\(\)/);
  assert.match(read('app/book/page.tsx'), /fetch\('\/api\/client-login\/logout'/);
  assert.match(read('public/sw.js'), /url.pathname.startsWith\('\/api\/'\)/);
});


test('real password verification rejects wrong credentials and keeps legacy compatibility', () => {
  const account = 'acct-example-001';
  const password = 'SecureSaaSPassword2026!';
  const first = hashClientPassword(account, password);
  const second = hashClientPassword(account, password);
  assert.notEqual(first, second, 'salt must be random for each hash');
  assert.ok(matchesClientPassword(account, password, first));
  assert.ok(matchesClientPassword(account, password, second));
  assert.equal(matchesClientPassword(account, 'wrong password', first), false);
  assert.equal(matchesClientPassword('acct-other', password, first), false);
  assert.equal(matchesClientPassword(account, password, 'scrypt$invalid'), false);
  const legacy = createHash('sha256').update(`zipbook-client-password:${account}:${password}`).digest('hex');
  assert.ok(matchesClientPassword(account, password, legacy));
  assert.equal(matchesClientPassword(account, 'wrong password', legacy), false);
});


test('authenticated SaaS booking preserves the verified account profile and never leaks query-string tokens', () => {
  const db = read('lib/db.ts');
  assert.match(db, /if \(!currentTenant\(\)\.legacy && !input.actor\) return input.customerId;/);
  const session = read('app/api/client-login/session/route.ts');
  assert.match(session, /currentTenant\(\)\.legacy \? request.nextUrl.searchParams.get\('token'\)/);
  const otp = read('lib/otpDelivery.ts');
  assert.match(otp, /process.env.NODE_ENV !== 'production'/);
});
