import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const path = (rel) => new URL(`../${rel}`, import.meta.url);
const read = (rel) => readFileSync(path(rel), 'utf8');
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const code = pkg.version.match(/^0\.(\d+)\.(\d+)$/);
const displayed = code ? `Ver-0.${String(Number(code[1])).padStart(3,'0')}.${code[2]}` : null;

test('package and dependency lock use the same release', () => {
  assert.ok(code, 'Expected version format 0.XX.PATCH');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
});

test('public, Admin and tenant API share one displayed release', () => {
  assert.ok(displayed);
  assert.match(read('lib/domains.ts'), new RegExp(`export const APP_VERSION = ['\"]${displayed}['\"]`));
  assert.match(read('lib/mockData.ts'), /export \{ APP_VERSION \} from ['\"]\.\/domains['\"]/);
  assert.match(read('components/Header.tsx'), /APP_VERSION/);
  assert.match(read('app/book/page.tsx'), /APP_VERSION/);
  assert.match(read('app/api/tenant-context/route.ts'), /APP_VERSION/);
  assert.ok(read('README.md').includes(displayed), 'Current README must display current version');
  assert.ok(read('FULL_PROGRAM_RELEASE_VER_0_063_3.md').includes(displayed), 'Current release notes must display current version');
});

test('service-worker cache key follows displayed release', () => {
  assert.ok(displayed);
  assert.ok(read('public/sw.js').includes(`zipbook-v${displayed.slice(4)}`));
});
