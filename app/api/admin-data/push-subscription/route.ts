import { NextRequest, NextResponse } from 'next/server';
import { disableAdminPushSubscription, getAdminPushSubscriptionStatus, saveAdminPushSubscription } from '@/lib/db';
import { requireAdminStaff } from '@/lib/adminStaffAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { actor } = await requireAdminStaff(request);
    const result = await getAdminPushSubscriptionStatus(actor);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not load admin push subscription status.'
    }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { actor } = await requireAdminStaff(request);
    const body = await request.json();
    const result = await saveAdminPushSubscription({
      actor,
      subscription: body?.subscription,
      userAgent: request.headers.get('user-agent') ?? ''
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not save admin push subscription.'
    }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { actor } = await requireAdminStaff(request);
    const body = await request.json().catch(() => ({}));
    const result = await disableAdminPushSubscription({
      actor,
      endpoint: typeof body?.endpoint === 'string' ? body.endpoint : ''
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not disable admin push subscription.'
    }, { status: 400 });
  }
}
