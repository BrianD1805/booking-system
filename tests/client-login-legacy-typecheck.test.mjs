import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('legacy code-request caller supplies fullName to the typed helper', () => {
  const db = read('lib/db.ts');
  const caller = db.slice(db.indexOf('export async function requestClientLoginOtp('));
  assert.match(caller, /ensureClientLoginCustomer\(\{ \.\.\.input, phone, email, fullName: 'Client user' \}\)/);
  const signup = db.slice(db.indexOf('export async function requestClientSignupOtp('), db.indexOf('export async function verifyClientSignupOtp('));
  assert.match(signup, /normaliseSignupName\(input\.firstName, input\.surname\)/);
  assert.match(signup, /createUnlinkedSaasClientCustomer\(phone, email, fullName\)/);
});

test('business tenants cannot call the legacy OTP account creation route', () => {
  const tenant = read('lib/tenantRequest.ts');
  assert.match(tenant, /if \(host\.kind === 'business'\)/);
  assert.match(tenant, /path === '\/api\/client-login\/request-code'/);
  assert.match(tenant, /status:403/);
});
