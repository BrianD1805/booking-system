import { NextRequest, NextResponse } from 'next/server';
import { requestClientSignupOtp } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await requestClientSignupOtp({
      phone: typeof body?.phone === 'string' ? body.phone : '',
      localPhone: typeof body?.localPhone === 'string' ? body.localPhone : '',
      countryDialCode: typeof body?.countryDialCode === 'string' ? body.countryDialCode : '',
      email: typeof body?.email === 'string' ? body.email : '',
      password: typeof body?.password === 'string' ? body.password : ''
    });

    return NextResponse.json({
      ok: true,
      otpId: result.otpId,
      channel: result.channel,
      destination: result.destination,
      expiresAt: result.expiresAt,
      deliveryMessage: result.deliveryMessage,
      deliveryMode: result.deliveryMode,
      deliveryProvider: result.deliveryProvider,
      deliveryReady: result.deliveryReady
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not create your sign-up code.'
    }, { status: 400 });
  }
}
