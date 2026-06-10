import { NextRequest, NextResponse } from 'next/server';
import { createBookingInDatabase, getBookings } from '@/lib/db';
import { requireAdminStaff } from '@/lib/adminStaffAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get('date') ?? undefined;
    const bookings = await getBookings(date);
    return NextResponse.json({ bookings });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not load bookings from Netlify Database.'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const required = ['patientName', 'patientPhone', 'patientEmail', 'procedureId', 'practitionerId', 'date', 'time', 'source'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required booking field: ${field}` }, { status: 400 });
      }
    }

    const source = body.source === 'admin' ? 'admin' : body.source === 'staff' ? 'staff' : 'client';
    const actor = source === 'client' ? undefined : (await requireAdminStaff(request)).actor;

    const booking = await createBookingInDatabase({
      patientName: String(body.patientName),
      patientPhone: String(body.patientPhone),
      patientEmail: String(body.patientEmail),
      customerId: body.customerId ? String(body.customerId) : undefined,
      procedureId: String(body.procedureId),
      practitionerId: String(body.practitionerId),
      date: String(body.date),
      time: String(body.time),
      source,
      notes: body.notes ? String(body.notes) : '',
      actor
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create booking in Netlify Database.';
    return NextResponse.json({ error: message }, { status: message.includes('Staff login') || message.includes('Master admin') ? 401 : 500 });
  }
}
