import { withTenantRequest } from '@/lib/tenantRequest';
import { NextRequest, NextResponse } from 'next/server';
import { createBookingInDatabase, getBookings, getClientBookingCustomerId } from '@/lib/db';
import { requireAdminStaff } from '@/lib/adminStaffAuth';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };

export async function GET(request: NextRequest) {
  return withTenantRequest(request, async () => {
  try { await requireAdminStaff(request); }
  catch { return NextResponse.json({ error: 'Staff login is required.' }, { status: 401, headers: noStore }); }
  try {
    const date = request.nextUrl.searchParams.get('date') ?? undefined;
    const bookings = await getBookings(date);
    return NextResponse.json({ bookings }, { headers: noStore });
  } catch (error) {
    return NextResponse.json({
      error: 'Could not load the practice diary.'
    }, { status: 500, headers: noStore });
  }
  });
}

export async function POST(request: NextRequest) {
  return withTenantRequest(request, async () => {
  try {
    const body = await request.json();
    const required = ['patientName', 'patientPhone', 'patientEmail', 'procedureId', 'practitionerId', 'date', 'time', 'source'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required booking field: ${field}` }, { status: 400, headers: noStore });
      }
    }

    const source = body.source === 'admin' ? 'admin' : body.source === 'staff' ? 'staff' : 'client';
    const actor = source === 'client' ? undefined : (await requireAdminStaff(request)).actor;
    let customerId = body.customerId ? String(body.customerId) : undefined;
    if (source === 'client') {
      const auth = request.headers.get('authorization') ?? '';
      const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
      if (token) {
        let authenticatedId: string;
        try { authenticatedId = await getClientBookingCustomerId(token); }
        catch { return NextResponse.json({ error: 'Please sign in again before booking.' }, { status: 401, headers: noStore }); }
        if (customerId && customerId !== authenticatedId) return NextResponse.json({ error: 'This client account cannot be used for the booking.' }, { status: 403, headers: noStore });
        customerId = authenticatedId;
      } else if (customerId) {
        return NextResponse.json({ error: 'Sign in before booking for a saved client account.' }, { status: 401, headers: noStore });
      }
    }

    const booking = await createBookingInDatabase({
      patientName: String(body.patientName),
      patientPhone: String(body.patientPhone),
      patientEmail: String(body.patientEmail),
      customerId,
      procedureId: String(body.procedureId),
      practitionerId: String(body.practitionerId),
      date: String(body.date),
      time: String(body.time),
      source,
      notes: body.notes ? String(body.notes) : '',
      actor
    });

    return NextResponse.json({ booking }, { status: 201, headers: noStore });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create booking.';
    return NextResponse.json({ error: message }, { status: message.includes('Staff login') || message.includes('Master admin') ? 401 : 500, headers: noStore });
  }
  });
}
