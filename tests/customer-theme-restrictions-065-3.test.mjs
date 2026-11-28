import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_THEME,PROTECTED_THEME,COLOR_KEYS,validateTheme,normalizeStoredTheme,themeVariables} from '../lib/customerTheme.mjs';
import {extractStyleSuggestions} from '../lib/websiteStyleAnalysis.mjs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const keys=['background','bottomLeft','font','primary','secondary','topRight'];
const custom={...DEFAULT_THEME,primary:'#24594A',secondary:'#623456',background:'#FFF8F2',font:'Georgia',topRight:'#FF0011',bottomLeft:'#800080'};
const legacy={...custom,panel:'#000000',text:'#FFFFFF',muted:'#FFFFFF',border:'#FF0000',scrollbar:'#FF00FF'};
test('only the approved fields survive validation, including forged legacy overrides',()=>{
 assert.deepEqual(Object.keys(validateTheme(legacy)).sort(),keys);assert.deepEqual(validateTheme(legacy),custom);assert.equal(COLOR_KEYS.length,5);
 assert.throws(()=>validateTheme({...custom,primary:'#FFFFFF'}));assert.throws(()=>validateTheme({...custom,background:'#000000'}));
 assert.throws(()=>validateTheme({...custom,font:'evil; color:red'}));
});
test('legacy theme reads keep valid permitted choices and individually repair incompatible ones',()=>{
 assert.deepEqual(normalizeStoredTheme(legacy),custom);
 assert.deepEqual(normalizeStoredTheme({...legacy,background:'#000000',font:'evil',primary:'#FFFFFF'}),{...custom,background:DEFAULT_THEME.background,font:DEFAULT_THEME.font,primary:DEFAULT_THEME.primary});
 const store=read('lib/customerThemeStore.ts');assert.match(store,/normalizeStoredTheme\(rows\[0\]\.theme\)/);assert.match(store,/JSON.stringify\(validateTheme\(theme\)\)/);
});
test('theme never changes any shared UI tokens, including palette and semantic states',()=>{
 const v=themeVariables(legacy);assert.deepEqual(Object.keys(v).sort(),['--zb-theme-bg','--zb-theme-bottom','--zb-theme-font','--zb-theme-primary','--zb-theme-secondary','--zb-theme-top']);
 assert.equal(v['--zb-theme-primary'],custom.primary);assert.equal(v['--zb-theme-bg'],custom.background);
 assert.equal(PROTECTED_THEME.panel,'#FFFFFF');assert.equal(PROTECTED_THEME.scrollbar,'#0761B3');
});
test('theme stylesheet only uses colour variables on approved surfaces and actions',()=>{
 const css=read('app/book/customer-theme.css').replace(/\/\*[\s\S]*?\*\//g,'');
 for(const rule of css.matchAll(/([^{}]+)\{([^{}]+)\}/g)){
  const [_,selector,decl]=rule;if(!/var\(--zb-theme-(?!font)/.test(decl))continue;
  assert.doesNotMatch(selector,/zip-calendar|time-picker|\.slot\b|scrollbar|\.notice|\.status-|\.confirmation-card|\.icon-button|\.client-signup-feedback/);
  if(decl.includes('--zb-theme-primary'))assert.match(selector,/\.button\.primary:not\(:disabled\)/);
  if(decl.includes('--zb-theme-secondary'))assert.match(selector,/\.pill:not\(\.danger\)|\.client-login-icon-button/);
  if(decl.includes('--zb-theme-bg'))assert.match(selector,/:not\(:has\(\.zb-book-embedded,\.booking-workflow\.is-open,\.client-auth-popup,\.booking-success-page\)\)/);
 }
 assert.doesNotMatch(css,/\b(?:padding|margin|border-width|border-radius|box-shadow|font-size|font-weight)\s*:/);
});
test('editor and website analyser expose only allowed keys and preview fixed UI values',()=>{
 const editor=read('components/admin/CustomerThemeCard.tsx');assert.match(editor,/COLOR_KEYS\.map/);assert.match(editor,/PROTECTED_THEME\.panel/);assert.match(editor,/PROTECTED_THEME\.scrollbar/);assert.doesNotMatch(editor,/theme\.(panel|text|muted|border|scrollbar)\b/);
 const scan=extractStyleSuggestions('button{background:#24594A;color:#fff} p{font-family:Georgia}');assert.deepEqual(Object.keys(scan.theme).sort(),keys);
});
