import { AsyncLocalStorage } from 'node:async_hooks';
const scope = new AsyncLocalStorage();
export function runInTenant(tenant, work) { return scope.run(Object.freeze({...tenant}), work); }
export function currentTenant() { const tenant = scope.getStore(); if (!tenant) throw new Error('Tenant context required.'); return tenant; }
export function classifyTenantHost(rawHost, { enabled = false, local = false } = {}) {
  const host = typeof rawHost === 'string' ? rawHost.toLowerCase().replace(/:\d+$/, '') : '';
  if (['zipbook.app','www.zipbook.app','admin.zipbook.app','bookings-system.netlify.app','localhost','127.0.0.1'].includes(host)) return { kind:'legacy', host };
  const suffix = host.endsWith('.zipbook.app') ? '.zipbook.app' : local && host.endsWith('.localhost') ? '.localhost' : '';
  const slug = suffix ? host.slice(0,-suffix.length) : '';
  if (enabled && /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/.test(slug) && !['www','admin','mail','api','app','platform','support'].includes(slug)) return {kind:'business', host, slug};
  return {kind:'unknown',host};
}
