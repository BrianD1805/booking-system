import { platformTransaction } from './dbProvider';
import { PlatformError } from './platformStore';
import { assessBusinessReadiness } from './platformReadinessPolicy.mjs';

// These tables must exist and have *restrictive* practice-scoped policies.
// The two legacy/extended tables were added in Ver-0.058 and Ver-0.060.
const scopedTables = [
  'practices','customers','bookings','practitioners','procedures',
  'admin_staff_members','admin_staff_sessions','zipbook_embed_domains',
  'zipbook_business_branding'
] as const;

type ReadinessRow = {
  id:string; name:string; tenant_slug:string; verified_at:string|null;
  pilot_enabled:boolean; onboarding_completed:boolean; active_owners:number;
  configured_practitioners:number; public_embed_sites:number;
  admin_embed_sites:number; has_logo:boolean;
};
type IsolationResult = {status:'pass'|'failed'|'unavailable';checkedTables:number;referenceType:'pilot'|'legacy'|'none'};

// Check the deployed RLS configuration and then make real reads with the exact
// constrained role used by tenant API requests. All probes are read-only.
async function auditIsolation(sourceId:string):Promise<IsolationResult> {
  return platformTransaction(async c=>{
    await c.query('SET TRANSACTION READ ONLY');
    const other=(await c.query<{id:string;plan_code:string|null}>(
      `SELECT id,plan_code FROM public.practices WHERE id<>$1 ORDER BY CASE WHEN plan_code='pilot' THEN 0 ELSE 1 END,id LIMIT 1`,
      [sourceId]
    )).rows[0];
    if(!other) return {status:'unavailable',checkedTables:0,referenceType:'none'};
    const policies=(await c.query<{relname:string;relrowsecurity:boolean;has_restrictive:boolean}>(`
      SELECT cls.relname,cls.relrowsecurity,
      EXISTS(SELECT 1 FROM pg_catalog.pg_policy pol WHERE pol.polrelid=cls.oid
        AND pol.polpermissive=false AND pol.polcmd='*'
        AND EXISTS(SELECT 1 FROM pg_catalog.pg_roles rr WHERE rr.rolname='zipbook_tenant_runtime' AND rr.oid=ANY(pol.polroles))
        AND pg_catalog.pg_get_expr(pol.polqual,pol.polrelid) LIKE '%zipbook.practice_id%'
      ) AS has_restrictive
      FROM pg_catalog.pg_class cls JOIN pg_catalog.pg_namespace n ON n.oid=cls.relnamespace
      WHERE n.nspname='public' AND cls.relname=ANY($1::text[]) AND cls.relkind IN ('r','p')
    `,[scopedTables])).rows;
    if(policies.length!==scopedTables.length || policies.some(p=>!p.relrowsecurity||!p.has_restrictive)) {
      return {status:'failed',checkedTables:policies.filter(p=>p.relrowsecurity&&p.has_restrictive).length,referenceType:other.plan_code==='pilot'?'pilot':'legacy'};
    }
    // An elevated lookup is used only to choose two distinct existing practices.
    // No customer records or private row data are copied into the audit response.
    await c.query('SET LOCAL ROLE zipbook_tenant_runtime');
    const referenceType=other.plan_code==='pilot'?'pilot':'legacy';
    for(const [own,foreign] of [[sourceId,other.id],[other.id,sourceId]]) {
      await c.query("SELECT set_config('zipbook.practice_id',$1,true)",[own]);
      const probe=(await c.query<{active_role:string;own_visible:boolean;foreign_visible:boolean}>(`
        SELECT current_user AS active_role,
        EXISTS(SELECT 1 FROM public.practices WHERE id=$1) AS own_visible,
        EXISTS(SELECT 1 FROM public.practices WHERE id=$2) AS foreign_visible
      `,[own,foreign])).rows[0];
      if(probe?.active_role!=='zipbook_tenant_runtime'||!probe.own_visible||probe.foreign_visible) {
        return {status:'failed',checkedTables:policies.length,referenceType};
      }
    }
    return {status:'pass',checkedTables:policies.length,referenceType};
  });
}

export async function getBusinessReadiness(id:string) {
  const business=await platformTransaction(async c=>{
    await c.query('SET TRANSACTION READ ONLY');
    return (await c.query<ReadinessRow>(`
      SELECT p.id,p.name,p.tenant_slug,i.verified_at::text,
        p.pilot_enabled,p.onboarding_completed,
        (SELECT count(*)::int FROM public.admin_staff_members s WHERE s.practice_id=p.id
          AND s.role='Owner' AND s.active AND s.password_hash<>'invitation-not-accepted') AS active_owners,
        (SELECT count(*)::int FROM public.practitioners d WHERE d.practice_id=p.id AND d.active
          AND EXISTS (SELECT 1 FROM public.practitioner_working_hours h WHERE h.practitioner_id=d.id AND h.active)
          AND EXISTS (SELECT 1 FROM public.practitioner_procedures x JOIN public.procedures s
            ON s.id=x.procedure_id AND s.practice_id=p.id AND s.active WHERE x.practitioner_id=d.id)
        ) AS configured_practitioners,
        (SELECT count(*)::int FROM public.zipbook_embed_domains e WHERE e.practice_id=p.id AND e.public_embed_enabled) AS public_embed_sites,
        (SELECT count(*)::int FROM public.zipbook_embed_domains e WHERE e.practice_id=p.id AND e.admin_embed_enabled) AS admin_embed_sites,
        EXISTS(SELECT 1 FROM public.zipbook_business_branding l WHERE l.practice_id=p.id) AS has_logo
      FROM public.practices p JOIN public.zipbook_owner_invitations i ON i.practice_id=p.id
      WHERE p.id=$1 AND p.plan_code='pilot'
    `,[id])).rows[0]??null;
  });
  if(!business) throw new PlatformError('Business not found.');
  // Audit failures are surfaced as a blocked check, never misreported as a pass.
  let isolation:IsolationResult;
  try { isolation=await auditIsolation(id); }
  catch { isolation={status:'failed',checkedTables:0,referenceType:'none'}; }
  const assessment=assessBusinessReadiness(business,isolation);
  return {business:{id:business.id,name:business.name,slug:business.tenant_slug},
    ...assessment,isolation:{...isolation,verifiedInDatabase:isolation.status==='pass'},
    note:'Read-only database checks do not replace manual browser, permissions, email, DNS or end-to-end booking tests.'};
}
