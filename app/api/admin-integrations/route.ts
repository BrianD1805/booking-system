import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { withTenantRequest } from '@/lib/tenantRequest';
import { currentTenant } from '@/lib/tenantScope.mjs';
import { getZipBookDatabase } from '@/lib/dbProvider';
import { requireBusinessOwner } from '@/lib/adminStaffAuth';
import { writeAdminAuditLog } from '@/lib/db';
import { normaliseWebsiteOrigin, permittedIntegrationWriteOrigin } from '@/lib/embedPolicy.mjs';

export const dynamic = 'force-dynamic';
const noStore = {'Cache-Control': 'private, no-store, max-age=0'};
type Row = {id:string;origin:string;public_embed_enabled:boolean;admin_embed_enabled:boolean};
const json = (value:unknown,status=200)=>NextResponse.json(value,{status,headers:noStore});

async function handle(request:NextRequest, method:'GET'|'POST') {
  return withTenantRequest(request,async()=>{
    const tenant=currentTenant();
    if(tenant.legacy) return json({error:'Website integration is available for independent business accounts.'},403);
    let actor;
    try { ({actor}=await requireBusinessOwner(request)); }
    catch { return json({error:'Business owner sign-in is required.'},401); }
    const database=getZipBookDatabase();
    if(method==='GET') {
      try {
        const websites=await database.sql<Row>`SELECT id, origin, public_embed_enabled, admin_embed_enabled FROM zipbook_embed_domains WHERE practice_id=${tenant.practiceId} ORDER BY origin`;
        return json({tenantSlug:tenant.tenantSlug,name:tenant.name,publicBookings:tenant.publicBookings!==false,websites});
      } catch {return json({error:'Website integrations could not be loaded. Check the Ver-0.058 Supabase migration.'},503);}
    }
    // The Next.js request URL may point at Netlify's internal handler, not the
    // visitor-facing business subdomain. Validate Origin against the tenant's
    // already-verified Host instead, preserving the same-origin CSRF boundary.
    const permitted=permittedIntegrationWriteOrigin(
      request.headers.get('origin'), request.headers.get('host'), tenant.host,
      process.env.NODE_ENV === 'production'
    );
    if(!permitted || !request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({error:'Request not permitted.'},403);
    const body=await request.json().catch(()=>null);
    if(!body || typeof body!=='object') return json({error:'Invalid request.'},400);
    const action=body.action;
    try {
      if(action==='save') {
        const origin=normaliseWebsiteOrigin(body.origin);
        const publicEnabled=body.publicEnabled===true;
        const adminEnabled=body.adminEnabled===true;
        if(!publicEnabled && !adminEnabled) return json({error:'Enable public bookings or staff diary access for this website.'},400);
        const id=typeof body.id==='string'?body.id:'';
        if(id) {
          if(!/^embed-[a-f0-9-]{36}$/.test(id)) return json({error:'Invalid website record.'},400);
          const result=await database.sql<Row>`UPDATE zipbook_embed_domains SET origin=${origin}, public_embed_enabled=${publicEnabled}, admin_embed_enabled=${adminEnabled}, updated_at=now() WHERE id=${id} AND practice_id=${tenant.practiceId} RETURNING id, origin, public_embed_enabled, admin_embed_enabled`;
          if(!result.length) return json({error:'Website record not found.'},404);
          await writeAdminAuditLog({action:'website_embed_updated',entityType:'practice',entityId:tenant.practiceId,source:'admin',actor,details:{origin,publicEnabled,adminEnabled}});
          return json({ok:true,website:result[0]});
        }
        const count=await database.sql<{count:string}>`SELECT count(*)::text as count FROM zipbook_embed_domains WHERE practice_id=${tenant.practiceId}`;
        if(Number(count[0]?.count??0)>=10) return json({error:'A business may register up to ten approved websites.'},400);
        const created=await database.sql<Row>`INSERT INTO zipbook_embed_domains (id, practice_id, origin, public_embed_enabled, admin_embed_enabled) VALUES (${`embed-${randomUUID()}`},${tenant.practiceId},${origin},${publicEnabled},${adminEnabled}) RETURNING id, origin, public_embed_enabled, admin_embed_enabled`;
        await writeAdminAuditLog({action:'website_embed_added',entityType:'practice',entityId:tenant.practiceId,source:'admin',actor,details:{origin,publicEnabled,adminEnabled}});
        return json({ok:true,website:created[0]});
      }
      if(action==='remove') {
        const id=typeof body.id==='string'?body.id:'';
        if(!/^embed-[a-f0-9-]{36}$/.test(id)) return json({error:'Invalid website record.'},400);
        const deleted=await database.sql<Row>`DELETE FROM zipbook_embed_domains WHERE id=${id} AND practice_id=${tenant.practiceId} RETURNING id, origin, public_embed_enabled, admin_embed_enabled`;
        if(!deleted.length) return json({error:'Website record not found.'},404);
        await writeAdminAuditLog({action:'website_embed_removed',entityType:'practice',entityId:tenant.practiceId,source:'admin',actor,details:{origin:deleted[0].origin}});
        return json({ok:true});
      }
      return json({error:'Unknown action.'},400);
    } catch (error) {
      if(error instanceof Error && /website|HTTPS|origin|wildcard|secure public/i.test(error.message) && !('code' in error)) return json({error:error.message},400);
      if((error as {code?:string})?.code==='23505') return json({error:'That website is already registered for this business.'},409);
      console.error('ZipBook website integration write failed.');
      return json({error:'Could not save website settings. Verify the database migration and try again.'},503);
    }
  });
}
export async function GET(request:NextRequest){return handle(request,'GET');}
export async function POST(request:NextRequest){return handle(request,'POST');}
