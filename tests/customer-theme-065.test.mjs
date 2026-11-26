import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_THEME,validateTheme,contrast,themeVariables,themeFontUrl} from '../lib/customerTheme.mjs';
import {publicIPv4,checkedWebsiteUrl,extractStyleSuggestions} from '../lib/websiteStyleAnalysis.mjs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('theme accepts only validated colors and known font families, not executable CSS',()=>{
 assert.deepEqual(validateTheme(DEFAULT_THEME),DEFAULT_THEME);
 for(const theme of [{...DEFAULT_THEME,primary:'#123;}'},{...DEFAULT_THEME,font:'Arial; background:url(https://example.com)'},{...DEFAULT_THEME,text:'#FFFFFF'},{...DEFAULT_THEME,primary:'#EEEEEE'},{...DEFAULT_THEME,font:'__proto__'}])assert.throws(()=>validateTheme(theme));
 const v=themeVariables({...DEFAULT_THEME,primary:'#24594A',font:'Poppins'});assert.equal(v['--zw-blue'],'#24594A');assert.match(v['--zb-theme-font'],/^Poppins/);assert.match(themeFontUrl('Poppins'),/^https:\/\/fonts\.googleapis\.com\/css2\?/);assert.equal(themeFontUrl('https://evil.example'),null);assert.ok(contrast(DEFAULT_THEME.primary,'#FFFFFF')>=4.5);
});
test('static analysis extracts palette and supported fonts with contrast-safe suggestions',()=>{
 const s=extractStyleSuggestions('/* color: #badbad */ :root{--brand:#246B54} button{background:#246B54;color:#fff} p{color:rgb(34, 51, 68);font-family:Poppins,Arial}');
 assert.ok(s.palette.includes('#246B54'));assert.ok(s.palette.includes('#223344'));assert.equal(s.theme.primary,'#246B54');assert.equal(s.theme.font,'Poppins');assert.deepEqual(validateTheme(s.theme),s.theme);assert.ok(!s.palette.includes('#BADBAD'));
});
test('website scanner rejects private or special addresses and unsafe URL forms',()=>{
 for(const address of ['127.0.0.1','0.0.0.0','10.2.3.4','172.16.0.2','192.168.0.1','169.254.169.254','100.64.0.1','198.18.0.1','192.0.2.1','198.51.100.3','203.0.113.2','224.0.0.1','240.0.0.1','::1','::ffff:127.0.0.1'])assert.equal(publicIPv4(address),false,address);
 assert.equal(publicIPv4('8.8.8.8'),true);
 for(const url of ['http://example.com','https://localhost','https://127.0.0.1','https://[::1]','https://2130706433','https://foo.internal','https://user:pass@example.com','https://example.com:8443','https://example.com/?secret=1','file:///etc/passwd'])assert.throws(()=>checkedWebsiteUrl(url),url);
 assert.equal(checkedWebsiteUrl('https://www.spbio.co.za/').hostname,'www.spbio.co.za');
 const scanner=read('lib/websiteStyleAnalysis.mjs');assert.match(scanner,/records\.some\(r=>!publicIPv4/);assert.match(scanner,/lookup:.*cb\(null,address,4\)/);assert.match(scanner,/u\.origin!==start\.origin/);assert.match(scanner,/MAX_BYTES/);assert.match(scanner,/res\.statusCode!==200/);
});
test('owner-only theme changes and database isolation are enforced by code and restrictive RLS',()=>{
 const route=read('app/api/admin-customer-theme/route.ts'),store=read('lib/customerThemeStore.ts'),sql=read('supabase/zipbook_customer_theme_ver_0_065.sql');
 assert.match(route,/withTenantRequest/);assert.match(route,/requireBusinessOwner/);assert.match(route,/permittedIntegrationWriteOrigin/);assert.match(route,/tenant\.legacy\|\|tenant\.demoVisitor/);assert.match(route,/reserveWebsiteScan/);assert.match(store,/currentTenant\(\)/);assert.match(store,/WHERE practice_id=\$\{t\.practiceId\}/);assert.match(sql,/AS RESTRICTIVE/);assert.match(sql,/current_setting\('zipbook.practice_id',true\)/);assert.match(sql,/ENABLE ROW LEVEL SECURITY/);assert.match(sql,/REVOKE ALL/);
});
test('customer-only theme loads server-side and is not shared with Admin or the demo',()=>{
 const layout=read('app/book/layout.tsx'),request=read('lib/customerThemeRequest.ts'),css=read('app/book/customer-theme.css');
 assert.match(layout,/await customerThemeForPage\(\)/);assert.match(layout,/if\(!theme\)return children/);assert.match(request,/host\.kind!==\x27business\x27/);assert.match(request,/runInTenant/);assert.match(css,/body:has\(#zb-customer-theme\)/);assert.match(css,/var\(--zb-theme-top\)/);assert.match(css,/var\(--zb-theme-scroll\)/);assert.doesNotMatch(read('app/admin/layout.tsx'),/customerThemeForPage|customer-theme.css/);assert.match(read('app/api/branding/manifest/route.ts'),/manifest\.theme_color=theme\.primary/);assert.match(read('public/sw.js'),/zipbook-v0\.065/);
});
test('theme editor does not save analysis until explicit save and retains reset and preview',()=>{
 const card=read('components/admin/CustomerThemeCard.tsx');assert.match(card,/action\('scan'\)/);assert.match(card,/action\('save'\)/);assert.match(card,/action\('reset'\)/);assert.match(card,/Live branding preview/);assert.match(card,/setTheme\(d\.theme\);if\(kind==='scan'\)/);assert.match(read('app/admin/settings/page.tsx'),/CustomerThemeCard/);
});
