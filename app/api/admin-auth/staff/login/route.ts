import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminDataKey } from '@/lib/adminDataAuth';
import { loginAdminStaff } from '@/lib/db';
import { readAdminActorRequestMeta } from '@/lib/adminStaffAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!verifyAdminDataKey(request)) {
    return NextResponse.json({ error: 'Master admin key is required before staff login.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await loginAdminStaff({
      email: String(body.email ?? ''),
      password: String(body.password ?? ''),
      actor: { source: 'staff-login', ...readAdminActorRequestMeta(request) }
    });
    const response = NextResponse.json(result);
    response.cookies.set('zipbook_staff_token', result.sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 12,
      path: '/admin'
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Staff login failed.' }, { status: 401 });
  }
}
