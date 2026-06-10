import { NextRequest, NextResponse } from 'next/server';
import { listAdminDataCustomers } from '@/lib/db';
import { requireAdminStaff } from '@/lib/adminStaffAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdminStaff(request);
    const query = request.nextUrl.searchParams.get('query') ?? '';
    const customers = await listAdminDataCustomers(query);
    return NextResponse.json({ customers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load admin customer data.' }, { status: 401 });
  }
}
