import {lookup} from 'node:dns/promises';
import {request} from 'node:https';
import {isIP} from 'node:net';
import {DEFAULT_THEME,FONT_STACKS,contrast,luminance,validateTheme} from './customerTheme.mjs';
// Deliberately IPv4-only. Block special-use, private, loopback, link-local, multicast,
// documentation and reserved ranges; pin TLS connection to checked address (no DNS rebinding).
export function publicIPv4(ip){if(isIP(ip)!==4)return false;const [a,b,c]=ip.split('.').map(Number);return a>0&&a<224&&a!==10&&a!==127&&!(a===100&&b>=64&&b<=127)&&!(a===169&&b===254)&&!(a===172&&b>=16&&b<=31)&&!(a===192&&(b===168||b===0||(b===88&&c===99)||(b===0&&c===2)))&&!(a===198&&(b===18||b===19||(b===51&&c===100)))&&!(a===203&&b===0&&c===113);}
export function checkedWebsiteUrl(input){const u=new URL(input);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||u.search||isIP(u.hostname)||u.hostname.length>253||!u.hostname.includes('.')||!/^([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(u.hostname)||/\.(localhost|local|internal|test|invalid|example|onion|home|lan)$/i.test(u.hostname)||u.pathname.length>1000)throw new Error('Enter a public HTTPS website URL without credentials, query or custom port.');return u;}
const MAX_BYTES=450_000;
async function safeFetch(url,kind,deadline){
 const remaining=()=>deadline-Date.now();if(remaining()<=0)throw new Error('Website analysis timed out.');
 let timer;const records=await Promise.race([lookup(url.hostname,{all:true,family:4}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('DNS lookup timed out.')),Math.min(2500,remaining()));})]).finally(()=>clearTimeout(timer));
 if(!records.length||records.some(r=>!publicIPv4(r.address)))throw new Error('Website must resolve to a public address.');
 const address=records[0].address;
 return new Promise((resolve,reject)=>{
  const req=request(url,{method:'GET',agent:false,family:4,autoSelectFamily:false,lookup:(_host,_opts,cb)=>cb(null,address,4),headers:{Accept:kind==='html'?'text/html':'text/css','Accept-Encoding':'identity','User-Agent':'ZipBook-Style-Analysis/1.0'}},res=>{
   const mime=String(res.headers['content-type']||'').toLowerCase();
   if(res.statusCode!==200||!(kind==='html'?mime.startsWith('text/html'):mime.startsWith('text/css'))||Number(res.headers['content-length']||0)>MAX_BYTES||(res.headers['content-encoding']&&res.headers['content-encoding']!=='identity')){res.destroy();reject(new Error('Website returned an unsupported response. Use the final HTTPS page URL.'));return;}
   const chunks=[];let length=0;res.on('data',chunk=>{length+=chunk.length;if(length>MAX_BYTES){req.destroy(new Error('Website file exceeds analysis limit.'));res.destroy();}else chunks.push(chunk);});res.on('error',reject);res.on('aborted',()=>reject(new Error('Website response interrupted.')));res.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));
  });
  const timeout=setTimeout(()=>req.destroy(new Error('Website analysis timed out.')),Math.max(1,Math.min(5000,remaining())));req.on('close',()=>clearTimeout(timeout));req.on('error',reject);req.end();
 });
}
function normalHex(s){if(/^#[\da-f]{3}$/i.test(s))return '#'+s.slice(1).split('').map(c=>c+c).join('').toUpperCase();return s.toUpperCase();}
export function extractStyleSuggestions(source){
 // Static analysis: read literal declarations, not scripts or remotely supplied CSS.
 const css=source.replace(/\/\*[\s\S]*?\*\//g,'');const counts=new Map();
 for(const match of css.matchAll(/(?:\b(?:background(?:-color)?|color|border(?:-color)?|fill|stroke)|--[\w-]+)\s*:\s*([^;{}\n]{1,300})/gi))for(const color of match[1].matchAll(/#[0-9a-f]{6}(?![0-9a-f])|#[0-9a-f]{3}(?![0-9a-f])|\brgb\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)/gi)){
  let c=color[0].startsWith('#')?normalHex(color[0]):color.slice(1).every(x=>Number(x)<=255)?'#'+color.slice(1).map(x=>Number(x).toString(16).padStart(2,'0')).join('').toUpperCase():null;if(c)counts.set(c,(counts.get(c)||0)+1);
 }
 const palette=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,24).map(([c])=>c);
 const foundFonts=[];for(const m of css.matchAll(/font-family\s*:\s*([^;{}\n]{1,200})/gi)){const f=m[1].split(',')[0].trim().replace(/^['"]|['"]$/g,'');if(f&&!foundFonts.includes(f)&&/^[\w -]{1,60}$/.test(f))foundFonts.push(f);}
 const supported=foundFonts.map(f=>Object.keys(FONT_STACKS).find(k=>k.toLowerCase()===f.toLowerCase())).find(Boolean);
 const dark=palette.filter(c=>contrast(c,'#FFFFFF')>=4.5&&contrast(c,DEFAULT_THEME.background)>=4.5&&luminance(c)>.02&&Math.max(...[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)))-Math.min(...[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)))>20);
 const theme={...DEFAULT_THEME,primary:dark[0]||DEFAULT_THEME.primary,secondary:dark[1]||dark[0]||DEFAULT_THEME.secondary,topRight:palette.find(c=>luminance(c)>.25&&luminance(c)<.85)||dark[0]||DEFAULT_THEME.topRight,bottomLeft:dark[1]||dark[0]||DEFAULT_THEME.bottomLeft,font:supported||DEFAULT_THEME.font};
 return {theme:validateTheme(theme),palette,fonts:foundFonts.slice(0,12)};
}
export async function analyseWebsite(input){
 const start=checkedWebsiteUrl(input),deadline=Date.now()+12000;const html=await safeFetch(start,'html',deadline);
 const clean=html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'');
 const styles=[...clean.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map(m=>m[1]);
 styles.push(...[...clean.matchAll(/\bstyle\s*=\s*(["'])(.*?)\1/gi)].map(m=>m[2]));
 const sheets=[];for(const m of clean.matchAll(/<link\b[^>]*>/gi)){if(!/\brel\s*=\s*["']?stylesheet\b/i.test(m[0]))continue;const href=m[0].match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];if(!href)continue;try{const u=new URL(href,start);if(u.origin!==start.origin)continue;u.hash='';u.search='';const checked=checkedWebsiteUrl(u.href);if(!sheets.some(v=>v.href===checked.href))sheets.push(checked);}catch{}if(sheets.length>=3)break;}
 let scanned=0;for(const sheet of sheets){if(Date.now()>deadline-1000)break;try{styles.push(await safeFetch(sheet,'css',deadline));scanned++;}catch{}}
 const result=extractStyleSuggestions(styles.join('\n'));return {...result,stylesheets:scanned,warning:'Suggestions from static HTML and up to three same-origin CSS files. No scripts run; web fonts and dynamic styles may not be detected.'};
}
