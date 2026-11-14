import { withTenantRequest } from '@/lib/tenantRequest';
import { NextRequest, NextResponse } from 'next/server';
import { getPublicBookedSlots } from '@/lib/db';
import { isValidAvailabilityDate } from '@/lib/publicAvailability.mjs';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };

export async function GET(request: NextRequest) {
  return withTenantRequest(request, async () => {
  const date = request.nextUrl.searchParams.get('date');
  if (!isValidAvailabilityDate(date)) return NextResponse.json({ error: 'A valid appointment date is required.' }, { status: 400, headers: noStore });
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  try {
    const bookings = await getPublicBookedSlots(date, token);
    return NextResponse.json({ bookings }, { headers: noStore });
  } catch (error) {
    console.error('ZipBook availability lookup failed');
    return NextResponse.json({ error: 'Could not check appointment availability.' }, { status: 500, headers: noStore });
  }
  });
}
