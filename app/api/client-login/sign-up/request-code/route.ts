import { withTenantRequest } from '@/lib/tenantRequest';
import { NextRequest, NextResponse } from 'next/server';
import { requestClientSignupOtp } from '@/lib/db';
import {isActiveRealDemoRequest} from '@/lib/publicDemoAuth';
import {isEmailProviderConfigured} from '@/lib/emailDelivery';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return withTenantRequest(request, async () => {
  try {
    if (isActiveRealDemoRequest() && !isEmailProviderConfigured()) return NextResponse.json({error:'Demo email verification is not configured yet.'},{status:503});
    const body = await request.json();
    const result = await requestClientSignupOtp({
      phone: typeof body?.phone === 'string' ? body.phone : '',
      localPhone: typeof body?.localPhone === 'string' ? body.localPhone : '',
      countryDialCode: typeof body?.countryDialCode === 'string' ? body.countryDialCode : '',
      email: typeof body?.email === 'string' ? body.email : '',
      firstName: typeof body?.firstName === 'string' ? body.firstName : '',
      surname: typeof body?.surname === 'string' ? body.surname : '',
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
      deliveryReady: result.deliveryReady,
      ...(result.testOtpCode ? { testOtpCode: result.testOtpCode } : {})
    });
  } catch (error) {
    const duplicate = (error as { code?: string })?.code === '23505';
    return NextResponse.json({
      error: duplicate
        ? 'An account already uses this email address or mobile number. Please sign in or reset your password.'
        : error instanceof Error ? error.message : 'Could not create your sign-up code.'
    }, { status: duplicate ? 409 : 400 });
  }
  });
}
