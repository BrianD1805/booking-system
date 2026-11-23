import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
export const DEMO_SESSION_SECONDS=900;
function sig(body,secret){return createHmac('sha256',secret).update(body).digest('base64url');}
export function issuePublicDemoSession(secret,now=Date.now()){
  if(typeof secret!=='string' || secret.length<32)throw new Error('Invalid demo session secret.');
  const body=Buffer.from(JSON.stringify({v:1,exp:Math.floor(now/1000)+DEMO_SESSION_SECONDS,nonce:randomBytes(16).toString('base64url')})).toString('base64url');
  return `${body}.${sig(body,secret)}`;
}
export function readPublicDemoSession(secret,token,now=Date.now()){
  if(typeof secret!=='string' || secret.length<32 || typeof token!=='string' || token.length>400)return null;
  const parts=token.split('.');
  if(parts.length!==2 || !/^[a-zA-Z0-9_-]{40,}$/.test(parts[1]))return null;
  const digest=Buffer.from(parts[1]);const expected=Buffer.from(sig(parts[0],secret));
  if(digest.length!==expected.length || !timingSafeEqual(digest,expected))return null;
  try{
    const data=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));
    if(data.v!==1 || !/^[a-zA-Z0-9_-]{20,}$/.test(data.nonce||'') || !Number.isSafeInteger(data.exp) || data.exp<=Math.floor(now/1000) || data.exp>Math.floor(now/1000)+DEMO_SESSION_SECONDS)return null;
    return {expiresAt:new Date(data.exp*1000).toISOString()};
  }catch{return null;}
}
