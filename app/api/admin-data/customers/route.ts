import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminDataKey } from '@/lib/adminDataAuth';
import { listAdminDataCustomers } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!verifyAdminDataKey(request)) {
    return NextResponse.json({ error: 'Admin data key is required.' }, { status: 401 });
  }

  try {
    const query = request.nextUrl.searchParams.get('query') ?? '';
    const customers = await listAdminDataCustomers(query);
    return NextResponse.json({ customers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load admin customer data.' }, { status: 500 });
  }
}
