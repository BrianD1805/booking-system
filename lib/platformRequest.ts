import { NextRequest, NextResponse } from 'next/server';
import { isPlatformHost, platformKeyMatches } from './platformPolicy.mjs';
import { PlatformError } from './platformStore';
export const platformJson=(payload:unknown,status=200)=>NextResponse.json(payload,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
export async function withPlatformRequest(request:NextRequest,operator:boolean,work:()=>Promise<Response>):Promise<Response> {
  if(!isPlatformHost(request.headers.get('host'),process.env.NODE_ENV!=='production')) return platformJson({error:'Not found.'},404);
  if(request.method!=='GET') {
    // Browser writes require an exact same-origin request and JSON. No CORS.
    const origin=request.headers.get('origin');
    let valid=false;
    try { const url=new URL(origin||''); valid=url.host.toLowerCase()===request.headers.get('host')?.toLowerCase() && (url.protocol==='https:' || (process.env.NODE_ENV!=='production'&&url.protocol==='http:')); } catch { /* denied */ }
    if(!valid || !request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return platformJson({error:'Request not permitted.'},403);
  }
  if(operator && !platformKeyMatches(process.env.ZIPBOOK_PLATFORM_ADMIN_KEY,request.headers.get('x-zipbook-platform-key'))) return platformJson({error:'Platform sign-in is required.'},401);
  try { return await work(); } catch(error) {
    if(error instanceof PlatformError) return platformJson({error:error.message},400);
    // Database details, token material and passwords must not be returned or logged.
    const code=(error as {code?:string}|null)?.code;
    if(code==='23505') return platformJson({error:'This business address is already registered.'},409);
    console.error('ZipBook platform operation failed.');
    return platformJson({error:'The platform operation could not be completed. Check configuration and try again.'},503);
  }
}
