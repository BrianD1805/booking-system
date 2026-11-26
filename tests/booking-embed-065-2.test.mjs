import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {attachBookingEmbed} from '../lib/bookingEmbed.mjs';
import {bookingHtmlSnippet,reactEmbedSnippet,adminHtmlSnippet} from '../lib/embedPolicy.mjs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const origin='https://spbio.zipbook.app';
function fixture({reduce=false,nested=false}={}) {
  const events=new Map(), frameEvents=new Map(), frames=new Map(), timers=new Map(), steps=[], sent=[];
  let id=0, now=0;
  const label={textContent:''}, attrs=new Map();
  const loader={hidden:false,dataset:{},querySelector:()=>label};
  const host={scrollTop:0,scrollHeight:900,clientHeight:800,parentElement:null,scrollTo({top}){this.scrollTop=top;}};
  const wrapper={parentElement:nested?host:null,querySelector:()=>loader,scrollHeight:240,clientHeight:240};
  const child={postMessage:(data,target)=>sent.push({data,target})};
  const frame={src:origin+'/book?embed=1',style:{height:'240px'},contentWindow:child,parentElement:wrapper,getBoundingClientRect:()=>({top:100,height:parseInt(frame.style.height)}),setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),addEventListener:(k,f)=>frameEvents.set(k,f),removeEventListener:k=>frameEvents.delete(k),scrollIntoView:()=>{}};
  const window={innerHeight:700,requestAnimationFrame:f=>{frames.set(++id,f);return id;},cancelAnimationFrame:i=>frames.delete(i),setInterval:()=>1,clearInterval:()=>{},setTimeout:f=>{timers.set(++id,f);return id;},clearTimeout:i=>timers.delete(i),addEventListener:(k,f)=>events.set(k,f),removeEventListener:k=>events.delete(k),scrollBy:({top})=>steps.push(top),matchMedia:()=>({matches:reduce})};
  const attach=vm.runInNewContext('('+attachBookingEmbed.toString()+')',{window,document:{},URL,getComputedStyle:()=>({overflowY:'auto'})});
  const clean=attach(frame);
  const msg=(data,from=origin,source=child)=>events.get('message')({origin:from,source,data});
  const tick=()=>{now+=16.67;const batch=[...frames.values()];frames.clear();for(const f of batch)f(now);};
  const drain=()=>{for(let i=0;frames.size&&i<120;i++)tick();assert.equal(frames.size,0);};
  return {loader,label,attrs,frame,host,steps,sent,events,timers,frameEvents,msg,tick,drain,clean};
}
const sum=v=>v.reduce((a,b)=>a+b,0);
const wheel=delta=>({type:'zipbook:embed:wheel',delta});
const ready={type:'zipbook:embed:ready'};
test('desktop wheel messages accumulate into multiple paced frames rather than discrete jumps',()=>{
  const f=fixture();f.msg(ready);f.msg(wheel(120));f.msg(wheel(120));assert.equal(f.steps.length,0);
  f.tick();assert.ok(f.steps[0]>0&&f.steps[0]<120);
  f.msg(wheel(120));f.drain();assert.ok(f.steps.length>5);assert.equal(sum(f.steps),360);f.clean();
});
test('scroll direction reverses without lingering momentum; native host gestures cancel pending animation',()=>{
  const f=fixture();f.msg(ready);f.msg(wheel(300));f.tick();const start=f.steps.length;f.msg(wheel(-150));f.drain();assert.ok(f.steps.slice(start).every(x=>x<0));assert.equal(sum(f.steps.slice(start)),-150);
  f.msg(wheel(200));f.events.get('wheel')();const length=f.steps.length;f.drain();assert.equal(f.steps.length,length);f.clean();
});
test('reduced motion is immediate and nested scrollers hand unused distance to the page',()=>{
  const f=fixture({reduce:true,nested:true});f.msg(ready);f.msg(wheel(160));assert.equal(f.host.scrollTop,100);assert.equal(sum(f.steps),60);f.msg(wheel(-140));assert.equal(f.host.scrollTop,0);assert.equal(sum(f.steps),20);f.clean();
});
test('loader is present immediately and only valid settled content removes it; timeout preserves fallback',()=>{
  const f=fixture();assert.equal(f.loader.hidden,false);assert.equal(f.frame.style.visibility,'hidden');assert.equal(f.attrs.get('aria-busy'),'true');
  f.msg(ready);f.msg({type:'zipbook:embed:height',height:400,contentReady:false});assert.equal(f.loader.hidden,false);
  f.msg({type:'zipbook:embed:height',height:400,contentReady:true},'https://evil.test');assert.equal(f.loader.hidden,false);
  [...f.timers.values()][0]();assert.equal(f.loader.dataset.state,'slow');assert.equal(f.frame.style.visibility,'');assert.match(f.label.textContent,/directly/);
  f.msg({type:'zipbook:embed:height',height:400,contentReady:true});assert.equal(f.loader.hidden,true);assert.equal(f.attrs.has('aria-busy'),false);
  f.frameEvents.get('load')();assert.equal(f.loader.hidden,false);assert.equal(f.frame.style.visibility,'hidden');f.clean();assert.equal(f.timers.size,0);
});
test('both generated customer snippets contain accessible centred host loader and animation, never staff snippets',()=>{
  for(const s of [bookingHtmlSnippet('spbio'),reactEmbedSnippet('spbio','public')]) {
    assert.match(s,/data-zipbook-loading[^\n]*role="status"/);assert.match(s,/justify-content:center/);assert.match(s,/zipbook-loading-spin/);assert.match(s,/prefers-reduced-motion/);assert.match(s,/contentReady === true/);assert.match(s,/Open booking page in a new tab/);
  }
  for(const s of [adminHtmlSnippet('spbio'),reactEmbedSnippet('spbio','admin')])assert.doesNotMatch(s,/data-zipbook-loading|contentReady/);
});
test('embedded entry omits the standalone logos and badge while retaining account and booking actions',()=>{
  const p=read('app/book/page.tsx'),css=read('app/book/booking-embed.css'),hook=read('app/book/useBookingEmbed.ts');
  assert.match(p,/!embedded && <header className="client-home-topbar"/);assert.match(p,/!embedded && <><div className="client-home-icon-wrap"/);assert.match(p,/embedded \? "Book an appointment"/);assert.match(p,/embedded && <button className="client-login-icon-button embed-account-action"/);assert.match(p,/onClick=\{openBookingFlow\}/);assert.match(p,/useBookingEmbed\(embedView, !loading && tenantContextSettled\)/);assert.match(hook,/\{height,contentReady\}/);assert.match(css,/\.zb-book-embedded \.client-home-welcome::after \{ display:none/);assert.match(css,/\.zb-book-embedded \.client-home-actions/);
});
