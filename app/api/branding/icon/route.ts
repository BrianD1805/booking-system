import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { withTenantRequest } from '@/lib/tenantRequest';
import { getLogoData } from '@/lib/businessBranding';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(request:NextRequest) {
  return withTenantRequest(request, async () => {
    const size=Number(request.nextUrl.searchParams.get('size') || '192');
    if (![72,180,192,512].includes(size)) return NextResponse.json({error:'Invalid image size.'},{status:400});
    try {
      const logo=await getLogoData();
      if (!logo) return NextResponse.redirect(new URL(size===180?'/apple-touch-icon.png':`/icons/icon-${size}.png`, request.url),
        {headers:{'Cache-Control':'private, no-store, max-age=0'}});
      const output=size===512?logo:await sharp(logo).resize(size,size).png().toBuffer();
      return new NextResponse(new Uint8Array(output),{status:200,headers:{
        'Content-Type':'image/png','Content-Disposition':'inline','Cache-Control':'private, no-store, max-age=0',
        'X-Content-Type-Options':'nosniff','Vary':'Host'
      }});
    } catch {
      return NextResponse.json({error:'Logo temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});
    }
  });
}
