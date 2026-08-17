import { NextRequest, NextResponse } from 'next/server';
import { deleteBookingFromDatabase, updateBookingDetailsInDatabase, updateBookingStatusInDatabase } from '@/lib/db';
import { requireAdminStaff } from '@/lib/adminStaffAuth';
import type { BookingStatus } from '@/lib/mockData';

export const dynamic = 'force-dynamic';

const allowedStatuses = new Set(['confirmed', 'arrived', 'completed', 'billing', 'rescheduled', 'cancelled', 'no_show']);
const bookingDetailFields = ['patientName', 'patientPhone', 'patientEmail', 'procedureId', 'practitionerId', 'date', 'time'];

function hasBookingDetailEdit(body: Record<string, unknown>) {
  return bookingDetailFields.some((field) => body[field]);
}

function readBookingInput(body: Record<string, unknown>) {
  for (const field of bookingDetailFields) {
    if (!body[field]) throw new Error(`Missing required booking field: ${field}`);
  }

  return {
    patientName: String(body.patientName),
    patientPhone: String(body.patientPhone),
    patientEmail: String(body.patientEmail),
    customerId: body.customerId ? String(body.customerId) : undefined,
    procedureId: String(body.procedureId),
    practitionerId: String(body.practitionerId),
    date: String(body.date),
    time: String(body.time),
    notes: body.notes ? String(body.notes) : ''
  };
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { actor } = await requireAdminStaff(request);
    const { id } = await context.params;
    const body = await request.json();

    if (hasBookingDetailEdit(body)) {
      const booking = await updateBookingDetailsInDatabase(id, readBookingInput(body), actor, actor.source === 'staff' ? 'staff' : 'admin');
      return NextResponse.json({ booking });
    }

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
    await deleteBookingFromDatabase(id, actor, actor.source === 'staff' ? 'staff' : 'admin');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not delete booking.' }, { status: 400 });
  }
}
