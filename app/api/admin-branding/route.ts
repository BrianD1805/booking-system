import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { withTenantRequest } from '@/lib/tenantRequest';
import { currentTenant } from '@/lib/tenantScope.mjs';
import { getZipBookDatabase } from '@/lib/dbProvider';
import { getLogoVersion } from '@/lib/businessBranding';
import { requireBusinessOwner } from '@/lib/adminStaffAuth';
import { writeAdminAuditLog } from '@/lib/db';
import { permittedIntegrationWriteOrigin } from '@/lib/embedPolicy.mjs';
import { LOGO_DIMENSION, MAX_LOGO_UPLOAD_BYTES, validateLogoMetadata } from '@/lib/brandingPolicy.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const headers = {'Cache-Control':'private, no-store, max-age=0'};
const json = (body:unknown,status=200)=>NextResponse.json(body,{status,headers});

async function handle(request:NextRequest,method:'GET'|'POST'|'DELETE') {
  return withTenantRequest(request, async () => {
    let actor;
    try {({actor}=await requireBusinessOwner(request));}
    catch {return json({error:'Business Owner sign-in is required.'},401);}
    const tenant=currentTenant();
    if (method==='GET') {
      try {return json({logoVersion:await getLogoVersion()});}
      catch {return json({error:'Branding settings unavailable. Apply the Ver-0.060 Supabase migration.'},503);}
    }
    // Same-origin CSRF check, comparing the browser Origin with the verified
    // tenant Host (never with Netlify's potentially internal request URL).
    const origin=request.headers.get('origin');
    const host=request.headers.get('host');
    const production=process.env.NODE_ENV==='production';
    const normalOrigin=permittedIntegrationWriteOrigin(origin,host,tenant.host,production);
    const localHost=!production && /^localhost(?::\d+)?$/.test(host??'') && tenant.host==='localhost' && origin===`http://${host}`;
    if (!normalOrigin && !localHost) {
      return json({error:'Request not permitted.'},403);
    }
    try {
      const database=getZipBookDatabase();
      if (method==='DELETE') {
        await database.sql`DELETE FROM zipbook_business_branding WHERE practice_id=${tenant.practiceId}`;
        await writeAdminAuditLog({action:'business_logo_removed',entityType:'practice',entityId:tenant.practiceId,source:'admin',actor});
        return json({ok:true,logoVersion:null});
      }
      const contentType=request.headers.get('content-type') ?? '';
      const length=Number(request.headers.get('content-length') || '0');
      if (!contentType.toLowerCase().startsWith('multipart/form-data;') || length > 2_500_000) return json({error:'Upload a PNG, JPEG or WebP logo (maximum 2 MB).'},400);
      const form=await request.formData();
      const file=form.get('logo');
      if (!(file instanceof File) || file.size>MAX_LOGO_UPLOAD_BYTES || file.size===0) return json({error:'Choose a logo file smaller than 2 MB.'},400);
      const raw=Buffer.from(await file.arrayBuffer());
      // Decode with a strict pixel limit; unsupported formats including SVG are rejected.
      const input=sharp(raw,{limitInputPixels:16_000_000,animated:false,failOn:'error'});
      const metadata=await input.metadata();
      validateLogoMetadata(metadata,raw.byteLength);
      const image=await input.rotate().resize(LOGO_DIMENSION,LOGO_DIMENSION,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).png({compressionLevel:9}).toBuffer();
      if (image.byteLength>MAX_LOGO_UPLOAD_BYTES) return json({error:'The processed logo is too large. Try a simpler or smaller image.'},400);
      const version=randomUUID();
      await database.sql`INSERT INTO zipbook_business_branding (practice_id,logo_data,logo_version,updated_at)
        VALUES (${tenant.practiceId},${image},${version},now())
        ON CONFLICT (practice_id) DO UPDATE SET logo_data=EXCLUDED.logo_data,logo_version=EXCLUDED.logo_version,updated_at=now()`;
      await writeAdminAuditLog({action:'business_logo_updated',entityType:'practice',entityId:tenant.practiceId,source:'admin',actor,details:{bytes:image.byteLength}});
      return json({ok:true,logoVersion:version});
    } catch (error) {
      if (error instanceof Error && /Logo|logo|image|pixels|Animated|Only PNG|file smaller/i.test(error.message) && !('code' in error)) return json({error:error.message},400);
      console.error('ZipBook owner logo update failed.');
      return json({error:'Could not update logo. Check the Ver-0.060 Supabase migration and try again.'},503);
    }
  });
}
export async function GET(request:NextRequest){return handle(request,'GET');}
export async function POST(request:NextRequest){return handle(request,'POST');}
export async function DELETE(request:NextRequest){return handle(request,'DELETE');}
