import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const client = source('app/book/page.tsx');
const select = source('components/ZipSelect.tsx');
const admin = source('app/admin/settings/page.tsx');
const api = source('app/api/admin-settings/route.ts');
const db = source('lib/db.ts');
const css = source('app/globals.css');
const countries = source('lib/phoneCountries.ts');
const migration = source('supabase/zipbook_default_customer_phone_country_ver_0_063_1.sql');

test('all 249 ISO countries and territories have searchable calling codes', () => {
  const records = [...countries.matchAll(/\{ name: .*?, iso: '([A-Z]{2})', dialCode: '\+([0-9]+)' \}/g)];
  assert.equal(records.length, 249);
  assert.equal(new Set(records.map(match => match[1])).size, 249);
  assert.match(client, /const PRIORITY_PHONE_COUNTRY_ISOS = \['GB', 'ZA', 'KE'\]/);
  assert.match(client, /const SECONDARY_PHONE_COUNTRY_ISOS = \['AU', 'NZ'\]/);
  assert.match(client, /EU_PHONE_COUNTRY_ISOS = \[/);
  assert.match(client, /searchOnly: !PRIORITY_PHONE_COUNTRY_ISOS/);
  assert.match(select, /if \(!needle\) return options\.filter\(option => !option\.searchOnly/);
  assert.match(select, /return options\.filter\(option => `\$\{option\.label\} \$\{option\.value\}`/);
});

test('country selection is rendered as a modal portal outside popup stacking contexts on desktop and mobile', () => {
  assert.match(select, /zip-select-country-overlay/);
  assert.match(select, /createPortal\(menu, document\.body\)/);
  assert.match(css, /\.zip-select-country-overlay\s*\{[^}]*z-index: 2147483000 !important/s);
  assert.match(select, /idealLeft = rect\.right \+ 22/);
  assert.match(select, /dialogTop = Math\.max/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*?\.zip-select-country-dialog[\s\S]*?left: auto !important/);
  assert.match(select, /aria-modal="true"/);
  assert.match(select, /Close country selector/);
});

test('country dialog is accessible via pointer and keyboard with search focus and Escape close', () => {
  assert.match(select, /window\.requestAnimationFrame\(\(\) => searchRef\.current\?\.focus\(\)\)/);
  assert.match(select, /event\.key === 'Escape'/);
  assert.match(select, /event\.key !== 'Tab'/);
  assert.match(select, /document\.body\.style\.overflow = 'hidden'/);
  assert.match(select, /document\.body\.style\.overflow = previousOverflow/);
});

test('Admin default phone country is independent of business location and saved tenant-scoped', () => {
  assert.match(admin, /Default customer phone country/);
  assert.match(admin, /clientPhoneCountryCode: string/);
  assert.match(admin, /settingsDraft\.clientPhoneCountryCode/);
  assert.match(api, /client_phone_country_code/);
  assert.match(api, /client_phone_country_code=\$\{clientPhoneCountryCode\}/);
  assert.match(api, /currentTenant\(\)\.practiceId/);
  assert.match(db, /clientPhoneCountryCode: row\.client_phone_country_code \?\? row\.country_code \?\? 'GB'/);
  assert.match(client, /practiceSettings\.clientPhoneCountryCode \?\? practiceSettings\.countryCode/);
  assert.match(migration, /ALTER TABLE public\.practices/);
  assert.match(migration, /GRANT UPDATE \(client_phone_country_code\) ON public\.practices TO zipbook_tenant_runtime/);
  assert.match(migration, /WHERE client_phone_country_code IS NULL/);
  assert.doesNotMatch(migration, /TRUNCATE|DELETE FROM public\.customers|DROP TABLE/i);
});

test('new Login / Sign up segmented control is fixed in the popup header next to Close', () => {
  const head = client.slice(client.indexOf('className="client-auth-head"'), client.indexOf("clientLoginStage !== 'signed-in' && ("));
  assert.match(head, /client-auth-head-actions/);
  assert.match(head, /auth-header-toggle/);
  assert.match(head, /aria-label="Close login"/);
  assert.doesNotMatch(client, /Login with your mobile number and password, or sign up once with email verification\./);
  assert.match(css, /\.client-auth-popup \.client-auth-card:not\(\.client-reset-card\)\s*\{\s*height: min\(625px/s);
  assert.match(css, /\.auth-header-toggle\.signup-mode \.auth-toggle-knob/);
  assert.match(head, /role="switch"/);
  assert.match(head, /className="auth-toggle-switch"/);
});

test('password eyes remain stationary with no monkey emoji', () => {
  assert.doesNotMatch(client, /🙈|👁/);
  assert.match(client, /aria-label=\{clientPasswordVisible \? 'Hide password' : 'Show password'/);
  assert.match(client, /aria-label=\{clientResetPasswordVisible \? 'Hide password' : 'Show password'/);
  assert.match(css, /\.client-auth-card \.password-visibility-button:hover[\s\S]*?transform: translateY\(-50%\) !important/);
});
