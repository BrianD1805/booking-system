import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('demo opens the actual customer home rather than forcing account creation', () => {
  const demo = source('app/demo/page.tsx');
  const book = source('app/book/page.tsx');
  assert.match(demo, /href="\/book" target="_blank" rel="noopener noreferrer"/);
  assert.match(demo, /guest booking/);
  assert.doesNotMatch(demo, /demoAccount=(signup|login)/);
  assert.doesNotMatch(book, /demoAccount/);
  assert.match(book, /Make a booking/);
  assert.match(book, /onClick=\{\(\) => openClientLogin\(clientProfile \? 'signed-in' : 'login'\)\}/);
});

test('demo customer app contains no unwanted escape-to-normal-booking button', () => {
  const book = source('app/book/page.tsx');
  assert.doesNotMatch(book, /End demo and open normal booking|leaveDemoForNormalBooking|demoExitError/);
  assert.match(book, /Return to demo options/);
});

test('creating an account shows visible progress and a prominent failure popup for every tenant', () => {
  const book = source('app/book/page.tsx');
  const css = source('app/globals.css');
  assert.match(book, /clientSignupFeedback/);
  assert.match(book, /kind: 'busy', message: 'Checking your details and sending your email verification code/);
  assert.match(book, /setClientSignupFeedback\(\{ kind: 'error', message \}\)/);
  assert.match(book, /const controller = new AbortController\(\)/);
  assert.match(book, /window.setTimeout\(\(\) => controller.abort\(\), 25000\)/);
  assert.match(book, /role=\{clientSignupFeedback.kind === 'error' \? 'alertdialog' : 'status'\}/);
  assert.match(book, /Account not created yet/);
  assert.match(book, /Go to Login/);
  assert.match(book, /OK, check details/);
  assert.match(css, /\.client-signup-feedback-backdrop/);
  assert.match(css, /\.client-signup-feedback-spinner/);
  assert.doesNotMatch(book.slice(book.indexOf('async function requestClientSignupCode'), book.indexOf('async function requestClientPasswordResetCode')), /demoMode/);
});

test('duplicate email and phone are explicitly rejected by the server and shown to user', () => {
  const db = source('lib/db.ts');
  assert.match(db, /A customer account already uses this email address/);
  assert.match(db, /An account already exists for this mobile number/);
  const request = source('app/book/page.tsx');
  assert.match(request, /await readJsonResponse<ClientCodeResponse>\(response\)/);
  assert.match(request, /clientSignupFeedback.message/);
  assert.match(request, /payload.deliveryReady === false/);
  assert.match(request, /disabled=\{clientLoginLoading\}/);
  assert.match(source('app/api/client-login/sign-up/request-code/route.ts'), /duplicate \? 409 : 400/);
});

test('incomplete sign-up fields give explicit feedback instead of a nonresponsive button', () => {
  const page = source('app/book/page.tsx');
  for (const phrase of ['Enter your first name.', 'Enter your surname.', 'Select a country and enter your mobile number.', 'Enter your email address.', 'Enter a valid email address.', 'Choose a password containing at least 8 characters.']) {
    assert.ok(page.includes(phrase), `Missing feedback: ${phrase}`);
  }
  assert.match(page, /if \(inputError\) \{\s*setClientSignupFeedback\(\{ kind: 'error', message: inputError \}\)/);
});

test('account UX patch 10 stays registered after subsequent releases', () => {
  const pkg = JSON.parse(source('package.json'));
  const lock = JSON.parse(source('package-lock.json'));
  assert.match(pkg.version, /^0\.(?:63\.(?:1[0-9]|[2-9]\d|\d{3,})|(?:6[4-9]|[7-9]\d|\d{3,})\.\d+)$/);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.equal(pkg.scripts['test:account-ux-patch10'], 'node --test tests/client-account-063-10.test.mjs');
  assert.match(source('lib/domains.ts'), /Ver-0\.(?:063\.\d+|0(?:6[4-9]|[7-9]\d)(?:\.\d+)?)/);
});
