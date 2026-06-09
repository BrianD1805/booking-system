import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminDataKey } from '@/lib/adminDataAuth';
import { deletePastBookingsForDemo, getPastBookingsDemoCleanupSummary } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!verifyAdminDataKey(request)) {
    return NextResponse.json({ error: 'Admin data key is required.' }, { status: 401 });
  }

  try {
    const summary = await getPastBookingsDemoCleanupSummary();
    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not check past bookings.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!verifyAdminDataKey(request)) {
    return NextResponse.json({ error: 'Admin data key is required.' }, { status: 401 });
  }

  if (request.nextUrl.searchParams.get('confirm') !== 'DELETE') {
    return NextResponse.json({ error: 'Add confirm=DELETE to remove past bookings.' }, { status: 400 });
  }

  try {
    const result = await deletePastBookingsForDemo();
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not remove past bookings.' }, { status: 500 });
  }
}
