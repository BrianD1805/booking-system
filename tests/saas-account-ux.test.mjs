import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normaliseSignupName } from '../lib/clientSignupName.mjs';
const src = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('signup requires first name and surname and keeps international names', () => {
  assert.equal(normaliseSignupName('  Anna  Maria ', " O’Neill "), 'Anna Maria O’Neill');
  assert.equal(normaliseSignupName('李', '明'), '李 明');
  for (const input of [['', 'Smith'], ['Jane', ''], ['M', '<script>'], ['Anne', 'x'.repeat(71)], [null, 'Jones']]) {
    assert.throws(() => normaliseSignupName(input[0], input[1]), /name|surname/i);
  }
});

test('popup collects names and submits them to the signup OTP route', () => {
  const page = src('app/book/page.tsx');
  assert.match(page, /id="clientSignupFirstName".*autoComplete="given-name"/);
  assert.match(page, /id="clientSignupSurname".*autoComplete="family-name"/);
  assert.match(page, /firstName: clientSignupFirstName/);
  assert.match(page, /surname: clientSignupSurname/);
  assert.match(page, /clientSignupFirstName\.trim\(\) && clientSignupSurname\.trim\(\)/);
  assert.match(src('app/api/client-login/sign-up/request-code/route.ts'), /firstName: typeof body\?\.firstName/);
  assert.match(src('app/api/client-login/sign-up/request-code/route.ts'), /surname: typeof body\?\.surname/);
});

test('server requires a verified identity before customer account can be created', () => {
  const db = src('lib/db.ts');
  assert.match(db, /normaliseSignupName\(input\.firstName, input\.surname\)/);
  assert.match(db, /createUnlinkedSaasClientCustomer\(phone, email, fullName\)/);
  assert.match(db, /\$\{fullName\}.*\$\{phone\}.*\$\{email\}/);
  assert.match(db, /if \(\(!currentTenant\(\)\.legacy \|\| isRealDemoTenant\(\)\) && existingAccount\)/);
  assert.match(db, /pendingCustomer\.fullName === 'Client user'/);
});

test('guest booking email is not treated as unique account email and guest history is not automatically linked', () => {
  const db = src('lib/db.ts');
  assert.match(db, /FROM client_accounts\s+WHERE practice_id = \$\{currentTenant\(\)\.practiceId\} AND lower\(login_email\) = \$\{email\}/);
  assert.match(db, /emailAccounts\[0\]\.login_phone !== phone/);
  assert.match(db, /createUnlinkedSaasClientCustomer\(phone, email, fullName\)/);
  assert.match(db, /separateGuest: input\.source === 'client' && !input\.customerId/);
});

test('country selector shows flags and dial codes separately from the mobile input and supports searching', () => {
  const page = src('app/book/page.tsx');
  const select = src('components/ZipSelect.tsx');
  const css = src('app/globals.css');
  assert.match(page, /String\.fromCodePoint\(0x1f1e6/);
  assert.match(page, /buttonLabel: `\$\{countryFlag\(country\.iso\)\}  \$\{country\.dialCode\}`/);
  assert.match(page, /options=\{COUNTRY_OPTIONS\}/);
  assert.match(page, /searchable/);
  assert.match(select, /visibleOptions = useMemo/);
  assert.match(select, /Search country or code/);
  assert.match(select, /createPortal\(menu, document\.body\)/);
  assert.match(css, /\/\* Ver-0\.063A: compact tenant welcome/);
  assert.match(css, /grid-template-columns: minmax\(116px, 135px\)/);
});

test('approved welcome panel is retained, heading uses only business name at a smaller size', () => {
  const page = src('app/book/page.tsx');
  assert.match(page, /className="client-home-welcome"/);
  assert.match(page, /className="hero-title clean-title"/);
  assert.match(page, /clientBusinessDisplayName\(businessInfo\.name\)/);
  assert.match(page, /replace\(\/\^ZipBook\\s\+\/i, ''\)/);
  assert.match(src('app/globals.css'), /font-size: clamp\(2\.05rem, 4\.4vw, 3\.35rem\)/);
});
