import { AsyncLocalStorage } from 'node:async_hooks';
const scope = new AsyncLocalStorage();
export function runInTenant(tenant, work) { return scope.run(Object.freeze({...tenant}), work); }
export function currentTenant() { const tenant = scope.getStore(); if (!tenant) throw new Error('Tenant context required.'); return tenant; }
export { classifyTenantHost } from './tenantHost.mjs';
