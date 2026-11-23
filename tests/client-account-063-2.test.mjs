import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('public booking projection carries practice default customer phone country', () => {
  const db = read('lib/db.ts');
  const projection = read('lib/publicAvailability.mjs');
  const page = read('app/book/page.tsx');
  assert.match(db, /clientPhoneCountryCode: row\.client_phone_country_code/);
  assert.match(projection, /clientPhoneCountryCode: p\.clientPhoneCountryCode/);
  assert.match(page, /practiceSettings\.clientPhoneCountryCode \?\? practiceSettings\.countryCode/);
  assert.match(page, /setClientCountryManuallyChanged\(true\)/);
});

test('country selector is centered on desktop without inline geometry', () => {
  const component = read('components/ZipSelect.tsx');
  const css = read('app/globals.css');
  assert.match(component, /zip-select-country-overlay/);
  assert.match(component, /createPortal\(menu, document\.body\)/);
  assert.doesNotMatch(component, /idealLeft = rect\.right|setCountryStyle/);
  assert.match(css, /@media \(min-width: 701px\) \{[\s\S]*?\.zip-select-country-overlay \.zip-select-country-dialog/);
});

test('mobile account header centres toggle and hides redundant text', () => {
  const page = read('app/book/page.tsx');
  const css = read('app/globals.css');
  assert.match(page, /className=\"client-auth-head-actions\"/);
  assert.match(page, /auth-header-toggle/);
  assert.match(css, /client-auth-title-copy h2 \{\s*display: none !important/);
  assert.match(css, /\.auth-header-toggle \{[\s\S]*?left: 50%/);
});

test('login phone inputs stay short and login password has desktop inline reset link', () => {
  const page = read('app/book/page.tsx');
  const css = read('app/globals.css');
  assert.match(page, /client-auth-login-mode/);
  assert.match(page, /client-login-password-layout/);
  assert.match(css, /client-login-fields \{[\s\S]*?align-content: start !important/);
  assert.match(css, /client-auth-login-mode \.phone-combo-control input \{[\s\S]*?height: 44px !important/);
  assert.match(css, /grid-template-columns: minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css, /client-login-password-layout \.password-visibility-button \{[\s\S]*?top: 50% !important/);
});

test('public bootstrap returns saved country on each request, without exposing private tenant fields', async () => {
  const { publicBootstrap } = await import('../lib/publicAvailability.mjs');
  const practice = (clientPhoneCountryCode) => ({
    practiceSettings: {
      practiceId: 'internal-tenant-id', practiceName: 'Dental Demo',
      countryCode: 'KE', clientPhoneCountryCode, timezone: 'Europe/London',
      workingDays: [1,2,3,4,5], workingStartTime: '09:00', workingEndTime: '17:00',
      slotIntervalMinutes: 15, minimumNoticeHours: 1, maxBookingAheadDays: 45,
      mobilePush: false
    },
    procedures: [], blockedDates: [], blockedTimes: [], practitioners: [],
    practitionerWorkingHours: [], practitionerProcedures: [], practitionerBlockedTimes: []
  });
  const australia = publicBootstrap(practice('AU'));
  const southAfrica = publicBootstrap(practice('ZA'));
  assert.equal(australia.practiceSettings.clientPhoneCountryCode, 'AU');
  assert.equal(southAfrica.practiceSettings.clientPhoneCountryCode, 'ZA');
  assert.equal(australia.practiceSettings.countryCode, 'KE');
  assert.equal(australia.practiceSettings.practiceId, '');
});
