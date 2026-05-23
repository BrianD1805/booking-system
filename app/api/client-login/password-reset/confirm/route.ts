import { NextRequest, NextResponse } from 'next/server';
import { confirmClientPasswordReset } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await confirmClientPasswordReset({
      otpId: typeof body?.otpId === 'string' ? body.otpId : '',
      code: typeof body?.code === 'string' ? body.code : '',
      password: typeof body?.password === 'string' ? body.password : ''
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not reset this password.'
    }, { status: 400 });
  }
}
