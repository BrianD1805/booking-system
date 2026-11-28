import {getZipBookDatabase} from '@/lib/dbProvider';
import {currentTenant} from '@/lib/tenantScope.mjs';
import {validateTheme,normalizeStoredTheme,type CustomerTheme} from '@/lib/customerTheme.mjs';
export async function getCustomerTheme():Promise<CustomerTheme|null>{
 const t=currentTenant(); if(t.legacy)return null;
 const rows=await getZipBookDatabase().sql<{theme:unknown}>`SELECT theme FROM zipbook_customer_themes WHERE practice_id=${t.practiceId}`;
 return rows[0]?.theme ? normalizeStoredTheme(rows[0].theme):null;
}
export async function saveCustomerTheme(theme:CustomerTheme|null){
 const t=currentTenant(); if(t.legacy||t.demoVisitor)throw new Error('Standard ZipBook branding is protected.');
 const json=theme===null?null:JSON.stringify(validateTheme(theme));
 await getZipBookDatabase().sql`INSERT INTO zipbook_customer_themes(practice_id,theme) VALUES (${t.practiceId},${json}::jsonb) ON CONFLICT(practice_id) DO UPDATE SET theme=EXCLUDED.theme,updated_at=now()`;
}
export async function reserveWebsiteScan(){
 const t=currentTenant();if(t.legacy||t.demoVisitor)return false;
 const rows=await getZipBookDatabase().sql<{practice_id:string}>`INSERT INTO zipbook_customer_themes(practice_id,last_scan_at) VALUES (${t.practiceId},now()) ON CONFLICT(practice_id) DO UPDATE SET last_scan_at=now() WHERE zipbook_customer_themes.last_scan_at IS NULL OR zipbook_customer_themes.last_scan_at < now()-interval '30 seconds' RETURNING practice_id`;
 return rows.length===1;
}
