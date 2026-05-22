import { NextRequest, NextResponse } from 'next/server';
import { verifyClientLoginOtp } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await verifyClientLoginOtp({
      otpId: typeof body?.otpId === 'string' ? body.otpId : '',
      code: typeof body?.code === 'string' ? body.code : ''
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not verify this client login code.'
    }, { status: 400 });
  }
}
