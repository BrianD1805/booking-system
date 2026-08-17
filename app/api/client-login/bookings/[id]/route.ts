import { NextRequest, NextResponse } from 'next/server';
import { deleteClientBookingForSession, updateClientBookingForSession } from '@/lib/db';

export const dynamic = 'force-dynamic';

function bearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') ?? '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

function readBookingInput(body: Record<string, unknown>) {
  const required = ['patientName', 'patientPhone', 'patientEmail', 'procedureId', 'practitionerId', 'date', 'time'];
  for (const field of required) {
    if (!body[field]) throw new Error(`Missing required booking field: ${field}`);
  }

  return {
    patientName: String(body.patientName),
    patientPhone: String(body.patientPhone),
    patientEmail: String(body.patientEmail),
    procedureId: String(body.procedureId),
    practitionerId: String(body.practitionerId),
    date: String(body.date),
    time: String(body.time),
    notes: body.notes ? String(body.notes) : ''
  };
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const token = bearerToken(request);
    if (!token) return NextResponse.json({ error: 'Client session required.' }, { status: 401 });
    const { id } = await context.params;
    const body = await request.json();
    const result = await updateClientBookingForSession(token, id, readBookingInput(body));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update booking.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const token = bearerToken(request);
    if (!token) return NextResponse.json({ error: 'Client session required.' }, { status: 401 });
    const { id } = await context.params;
    const result = await deleteClientBookingForSession(token, id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not delete booking.' }, { status: 400 });
  }
}
