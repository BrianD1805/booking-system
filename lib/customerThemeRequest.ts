import {headers} from 'next/headers';
import {cache} from 'react';
import {lookupTenant} from '@/lib/dbProvider';
import {classifyTenantHost,runInTenant} from '@/lib/tenantScope.mjs';
import {getCustomerTheme} from '@/lib/customerThemeStore';
export const customerThemeForPage=cache(async()=>{
 const h=await headers();
 const host=classifyTenantHost(h.get('host'),{enabled:process.env.ZIPBOOK_ENABLE_BUSINESS_ACCOUNTS==='1',local:process.env.NODE_ENV!=='production'});
 if(host.kind!=='business')return null;
 try{const tenant=await lookupTenant(null,host.slug);if(!tenant)return null;return await runInTenant({...tenant,host:host.host,legacy:false},getCustomerTheme);}
 catch{console.error('ZipBook customer theme unavailable; using standard branding.');return null;}
});
