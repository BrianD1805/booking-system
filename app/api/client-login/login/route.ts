import { NextRequest, NextResponse } from 'next/server';
import { loginClientWithPassword } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await loginClientWithPassword({
      phone: typeof body?.phone === 'string' ? body.phone : '',
      localPhone: typeof body?.localPhone === 'string' ? body.localPhone : '',
      countryDialCode: typeof body?.countryDialCode === 'string' ? body.countryDialCode : '',
      password: typeof body?.password === 'string' ? body.password : ''
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not sign in.'
    }, { status: 400 });
  }
}
