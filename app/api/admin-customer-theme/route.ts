import {NextRequest,NextResponse} from 'next/server';
import {withTenantRequest} from '@/lib/tenantRequest';
import {currentTenant} from '@/lib/tenantScope.mjs';
import {requireBusinessOwner} from '@/lib/adminStaffAuth';
import {permittedIntegrationWriteOrigin} from '@/lib/embedPolicy.mjs';
import {DEFAULT_THEME,validateTheme} from '@/lib/customerTheme.mjs';
import {getCustomerTheme,saveCustomerTheme,reserveWebsiteScan} from '@/lib/customerThemeStore';
import {analyseWebsite,checkedWebsiteUrl} from '@/lib/websiteStyleAnalysis.mjs';
import {writeAdminAuditLog} from '@/lib/db';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store, max-age=0'}});
async function handle(request:NextRequest,write:boolean){return withTenantRequest(request,async()=>{
 const tenant=currentTenant();if(tenant.legacy||tenant.demoVisitor)return json({error:'Standard ZipBook branding is protected.'},403);
 let actor;try{({actor}=await requireBusinessOwner(request));}catch{return json({error:'Business Owner sign-in is required.'},401);}
 if(!write){try{const theme=await getCustomerTheme();return json({theme:theme??DEFAULT_THEME,custom:Boolean(theme)});}catch{return json({error:'Branding unavailable. Check the Ver-0.065 migration.'},503);}}
 if(!permittedIntegrationWriteOrigin(request.headers.get('origin'),request.headers.get('host'),tenant.host,process.env.NODE_ENV==='production'))return json({error:'Request not permitted.'},403);
 let body;try{if(!request.headers.get('content-type')?.startsWith('application/json'))throw new Error();const raw=await request.text();if(raw.length>8192)throw new Error();body=JSON.parse(raw);}catch{return json({error:'Invalid branding request.'},400);}
 if(body?.action==='scan'){
  try{if(typeof body.url!=='string'||body.url.length>1500)throw new Error('Enter a valid public HTTPS website.');checkedWebsiteUrl(body.url);}catch{return json({error:'Enter a valid public HTTPS website URL.'},400);}
  try{if(!await reserveWebsiteScan())return json({error:'Please allow 30 seconds between website analyses.'},429);const result=await analyseWebsite(body.url);return json(result);}catch{return json({error:'Unable to analyse this website. Check its final HTTPS address or choose colours manually.'},422);}
 }
 if(body?.action!=='save'&&body?.action!=='reset')return json({error:'Invalid action.'},400);
 let theme;try{theme=body.action==='reset'?null:validateTheme(body.theme);}catch(e){return json({error:e instanceof Error?e.message:'Invalid theme.'},400);}
 try{await saveCustomerTheme(theme);await writeAdminAuditLog({action:theme?'customer_theme_updated':'customer_theme_reset',entityType:'practice',entityId:tenant.practiceId,source:'admin',actor});return json({theme:theme??DEFAULT_THEME,custom:Boolean(theme)});}catch{return json({error:'Could not save branding. Check migration and try again.'},503);}
});}
export async function GET(request:NextRequest){return handle(request,false);}
export async function POST(request:NextRequest){return handle(request,true);}
