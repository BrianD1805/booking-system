import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {allowedEmbedParent,attachBookingEmbed} from '../lib/bookingEmbed.mjs';
import {bookingHtmlSnippet,reactEmbedSnippet,businessEmbedUrls} from '../lib/embedPolicy.mjs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const parent='https://sp-bio.netlify.app', origin='https://spbio.zipbook.app';
function fixture(reducedMotion=true){
 const listeners=new Map(), frameListeners=new Map(), sent=[], scroll=[], revealed=[];
 let rect={top:50,height:850}; let count=0; const frames=new Map();
 const contentWindow={postMessage:(data,target)=>sent.push({data,target})};
 const frame={src:origin+'/book?embed=1',contentWindow,style:{height:'850px'},parentElement:null,getBoundingClientRect:()=>rect,scrollIntoView:v=>revealed.push(v),addEventListener:(t,f)=>frameListeners.set(t,f),removeEventListener:t=>frameListeners.delete(t)};
 const window={innerHeight:600,addEventListener:(t,f)=>listeners.set(t,f),removeEventListener:t=>listeners.delete(t),setInterval:()=>1,clearInterval:()=>{},requestAnimationFrame:f=>{frames.set(++count,f);return count;},cancelAnimationFrame:id=>frames.delete(id),clearTimeout:()=>{},matchMedia:()=>({matches:reducedMotion}),scrollBy:v=>scroll.push(v)};
 const attach=vm.runInNewContext('('+attachBookingEmbed.toString()+')',{window,URL,getComputedStyle:()=>({overflowY:'visible'})});
 const cleanup=attach(frame);
 const message=(data,eventOrigin=origin,source=contentWindow)=>listeners.get('message')({data,origin:eventOrigin,source});
 return {frame,message,sent,scroll,revealed,cleanup,listeners,frameListeners,setRect:r=>rect=r,flush:(now)=>{const batch=[...frames.values()];frames.clear();for(const fn of batch)fn(now);}};
}
test('only exact authorised public origins can negotiate embed mode',()=>{
 const policy=`frame-ancestors ${parent} https://www.spbio.co.za`;
 assert.equal(allowedEmbedParent(policy,parent),true);
 for(const bad of ['https://sp-bio.netlify.app.evil.test','https://sp-bio.netlify.app/','http://sp-bio.netlify.app','null',null])assert.equal(allowedEmbedParent(policy,bad),false);
 assert.equal(allowedEmbedParent("frame-ancestors 'none'",parent),false);
 const hook=read('app/book/useBookingEmbed.ts');assert.match(hook,/window\.parent === window/);assert.match(hook,/event\.source !== window\.parent/);assert.match(hook,/safeRemoteFramePolicy/);assert.match(hook,/allowedEmbedParent\(policy,event\.origin\)/);assert.match(hook,/embed-frame-policy\?kind=public/);
});
test('parent rejects spoofed messages and only resizes after ready from exact frame',()=>{
 const f=fixture();assert.equal(f.sent[0].target,origin);
 f.message({type:'zipbook:embed:height',height:500});assert.equal(f.frame.style.height,'850px');
 f.message({type:'zipbook:embed:ready'},'https://evil.test');
 f.message({type:'zipbook:embed:ready'},origin,{});
 f.message({type:'zipbook:embed:height',height:500});assert.equal(f.frame.style.height,'850px');
 f.message({type:'zipbook:embed:ready'});
 f.message({type:'zipbook:embed:height',height:520.4});assert.equal(f.frame.style.height,'521px');
 f.message({type:'zipbook:embed:height',height:1200});assert.equal(f.frame.style.height,'1200px');
 f.message({type:'zipbook:embed:height',height:300});assert.equal(f.frame.style.height,'300px');
 for(const height of [NaN,Infinity,-1,0,'900'])f.message({type:'zipbook:embed:height',height});assert.equal(f.frame.style.height,'300px');
 f.message({type:'zipbook:embed:height',height:50000});assert.equal(f.frame.style.height,'16000px');
 f.message({type:'zipbook:embed:height',height:10});assert.equal(f.frame.style.height,'240px');
 f.frameListeners.get('load')();f.message({type:'zipbook:embed:height',height:900});assert.equal(f.frame.style.height,'240px');
});
test('wheel and reveal commands are bounded and verified, cleanup removes listeners',()=>{
 const f=fixture();f.message({type:'zipbook:embed:ready'});
 f.message({type:'zipbook:embed:wheel',delta:5000},'https://evil.test');assert.equal(f.scroll.length,0);
 f.message({type:'zipbook:embed:wheel',delta:5000});assert.equal(f.scroll[0].top,1200);
 f.message({type:'zipbook:embed:wheel',delta:-120});assert.equal(f.scroll[1].top,-120);
 f.message({type:'zipbook:embed:wheel',delta:'120'});assert.equal(f.scroll.length,2);
 f.message({type:'zipbook:embed:reveal'});assert.equal(f.revealed.length,0);
 f.setRect({top:-600,height:850});f.message({type:'zipbook:embed:reveal'});assert.equal(f.revealed.length,1);
 f.cleanup();assert.equal(f.listeners.size,0);assert.equal(f.frameListeners.size,0);
});
test('HTML and React snippets include the handshake and fallback, direct URLs are unchanged',()=>{
 const html=bookingHtmlSnippet('spbio'),react=reactEmbedSnippet('spbio','public');
 for(const s of [html,react]){assert.match(s,/\/book\?embed=1/);assert.match(s,/zipbook:embed:height/);assert.match(s,/Open booking page in a new tab/);assert.match(s,/loading="eager"/);assert.doesNotMatch(s,/minHeight|scrolling="no"|postMessage\([^\n]*,\s*['"]\*['"]/);}
 assert.equal(businessEmbedUrls('spbio').booking,origin+'/book');
 assert.doesNotMatch(reactEmbedSnippet('spbio','admin'),/embed=1|zipbook:embed:height/);
 const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];assert.doesNotThrow(()=>new vm.Script(script));
});
test('embedded flow measures the content root, preserves inner scrolling and isolates styles',()=>{
 const hook=read('app/book/useBookingEmbed.ts'),css=read('app/book/booking-embed.css'),page=read('app/book/page.tsx');
 assert.match(hook,/new ResizeObserver/);assert.match(hook,/getBoundingClientRect\(\)\.bottom\+window\.scrollY/);assert.match(hook,/event\.composedPath\(\)/);assert.match(hook,/event\.ctrlKey/);assert.match(hook,/passive:false/);assert.match(css,/background: transparent !important/);assert.match(css,/\.zb-book-embedded\[data-embed-view="times"\]/);assert.match(page,/useBookingEmbed\(embedView,/);assert.match(page,/!embedded && <ClientInstallPrompt/);assert.doesNotMatch(read('app/admin/layout.tsx'),/booking-embed|useBookingEmbed/);
});
