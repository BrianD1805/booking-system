import { NextRequest, NextResponse } from 'next/server';
import { searchCustomers } from '@/lib/db';
import { requireAdminStaff } from '@/lib/adminStaffAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdminStaff(request);
    const query = request.nextUrl.searchParams.get('query') ?? '';
    const customers = await searchCustomers(query);
    return NextResponse.json({ customers });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not search customers from Netlify Database.'
    }, { status: 401 });
  }
}
