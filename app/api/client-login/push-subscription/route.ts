import { NextRequest, NextResponse } from 'next/server';
import { disableClientPushSubscriptionForSession, getClientPushSubscriptionStatus, saveClientPushSubscriptionForSession } from '@/lib/db';

export const dynamic = 'force-dynamic';

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? '';
  return authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '';
}

export async function GET(request: NextRequest) {
  try {
    const result = await getClientPushSubscriptionStatus(getBearerToken(request));
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not load push subscription status.'
    }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await saveClientPushSubscriptionForSession({
      sessionToken: getBearerToken(request),
      subscription: body?.subscription,
      userAgent: request.headers.get('user-agent') ?? ''
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not save push subscription.'
    }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await disableClientPushSubscriptionForSession({
      sessionToken: getBearerToken(request),
      endpoint: typeof body?.endpoint === 'string' ? body.endpoint : ''
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not disable push subscription.'
    }, { status: 400 });
  }
}
