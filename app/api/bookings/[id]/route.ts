import { NextRequest, NextResponse } from 'next/server';
import { deleteBookingFromDatabase, updateBookingStatusInDatabase } from '@/lib/db';
import { requireAdminStaff } from '@/lib/adminStaffAuth';
import type { BookingStatus } from '@/lib/mockData';

export const dynamic = 'force-dynamic';

const allowedStatuses = new Set(['confirmed', 'rescheduled', 'cancelled', 'completed', 'no_show']);

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { actor } = await requireAdminStaff(request);
    const { id } = await context.params;
    const body = await request.json();
    const status = String(body.status ?? '') as BookingStatus;
    if (!allowedStatuses.has(status)) return NextResponse.json({ error: 'Invalid booking status.' }, { status: 400 });
    const booking = await updateBookingStatusInDatabase(id, status, actor);
    return NextResponse.json({ booking });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update booking.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { actor } = await requireAdminStaff(request);
    const { id } = await context.params;
    await deleteBookingFromDatabase(id, actor);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not delete booking.' }, { status: 400 });
  }
}
