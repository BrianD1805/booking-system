import { AsyncLocalStorage } from 'node:async_hooks';
const scope = new AsyncLocalStorage();
export function runInTenant(tenant, work) { return scope.run(Object.freeze({...tenant}), work); }
export function currentTenant() { const tenant = scope.getStore(); if (!tenant) throw new Error('Tenant context required.'); return tenant; }
// A demo is a property of one verified REQUEST, never of the whole practice.
// The signed demo cookie is checked by tenantRequest before populating this
// context. An ordinary request to the same practice has demoVisitor=false.
export function isVerifiedDemoRequestContext(now=Date.now()) {
  const tenant=currentTenant();
  return tenant.demoVisitor===true && typeof tenant.demoExpiresAt==='string' &&
    Number.isFinite(Date.parse(tenant.demoExpiresAt)) && Date.parse(tenant.demoExpiresAt)>now;
}
export { classifyTenantHost } from './tenantHost.mjs';
