import { NextRequest, NextResponse } from 'next/server';
import { deletePastBookingsForDemo, getPastBookingsDemoCleanupSummary } from '@/lib/db';
import { requireAdminStaff } from '@/lib/adminStaffAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdminStaff(request);
    const summary = await getPastBookingsDemoCleanupSummary();
    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not check past bookings.' }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdminStaff(request);
    const confirm = request.nextUrl.searchParams.get('confirm') ?? '';
    if (confirm !== 'DELETE') {
      return NextResponse.json({ error: 'Add ?confirm=DELETE to confirm demo cleanup.' }, { status: 400 });
    }
    const result = await deletePastBookingsForDemo();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not remove past bookings.' }, { status: 400 });
  }
}
