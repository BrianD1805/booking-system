import { NextRequest, NextResponse } from 'next/server';
import { requireAdminStaff } from '@/lib/adminStaffAuth';
import { getClientBookingChangeAlertsSince } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdminStaff(request);
    const since = request.nextUrl.searchParams.get('since') ?? undefined;
    const alerts = await getClientBookingChangeAlertsSince(since);
    return NextResponse.json({ alerts, checkedAt: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not check booking alerts.';
    return NextResponse.json({ error: message }, { status: message.includes('Staff login') || message.includes('Master admin') ? 401 : 400 });
  }
}
