import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { classifyTenantHost } from './tenantScope.mjs';
export function isPlatformHost(raw, local=false) {
  const host=typeof raw==='string'?raw.toLowerCase().replace(/:\d+$/,''):'';
  return ['zipbook.app','www.zipbook.app'].includes(host) || (local && ['localhost','127.0.0.1'].includes(host));
}
export function platformKeyMatches(expected, supplied) {
  if(typeof expected!=='string'||! /^[a-f0-9]{64}$/i.test(expected)||typeof supplied!=='string'||! /^[a-f0-9]{64}$/i.test(supplied)) return false;
  return timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(supplied,'hex'));
}
export const makeInviteToken=()=>randomBytes(32).toString('base64url');
export const inviteHash=token=>createHash('sha256').update(token).digest('hex');
export const isInviteToken=token=>typeof token==='string'&&/^[A-Za-z0-9_-]{43}$/.test(token);
export function validateBusiness(input) {
  const value=key=>typeof input?.[key]==='string'?input[key].trim():'';
  const name=value('name'), slug=value('slug'), ownerName=value('ownerName'), ownerEmail=value('ownerEmail').toLowerCase(), timezone=value('timezone'), currency=value('currency'), country=value('country');
  if (!name||name.length>120||!ownerName||ownerName.length>120) throw new Error('Enter a business name and owner name (120 characters maximum).');
  if (slug!==slug.toLowerCase()||classifyTenantHost(`${slug}.zipbook.app`,{enabled:true}).kind!=='business') throw new Error('Choose an available lowercase business address using letters, numbers or hyphens.');
  if (ownerEmail.length>254||! /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(ownerEmail)) throw new Error('Enter a valid owner email address.');
  if (!/^[A-Z]{3}$/.test(currency)||! /^[A-Z]{2}$/.test(country)) throw new Error('Enter a three-letter currency and two-letter country code.');
  try { if(!timezone||timezone.length>100) throw Error(); new Intl.DateTimeFormat('en-GB',{timeZone:timezone}); } catch { throw new Error('Enter a valid IANA timezone, such as Europe/London.'); }
  return {name,slug,ownerName,ownerEmail,timezone,currency,country};
}
export function validOwnerPassword(password) {return typeof password==='string'&&password.length>=14&&password.length<=128&&password.trim().length>=14;}
