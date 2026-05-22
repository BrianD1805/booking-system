import { NextRequest, NextResponse } from 'next/server';
import { requestClientLoginOtp } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await requestClientLoginOtp({
      phone: typeof body?.phone === 'string' ? body.phone : '',
      email: typeof body?.email === 'string' ? body.email : ''
    });

    return NextResponse.json({
      ok: true,
      otpId: result.otpId,
      channel: result.channel,
      destination: result.destination,
      expiresAt: result.expiresAt,
      devCode: result.devCode,
      deliveryMode: 'development-preview'
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not create a client login code.'
    }, { status: 400 });
  }
}
