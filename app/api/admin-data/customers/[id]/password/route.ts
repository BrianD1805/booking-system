import { NextRequest, NextResponse } from 'next/server';
import { setAdminDataCustomerPassword } from '@/lib/db';
import { requireAdminStaff } from '@/lib/adminStaffAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { actor } = await requireAdminStaff(request);
    const { id } = await context.params;
    const body = await request.json();
    const customer = await setAdminDataCustomerPassword({ customerId: id, password: String(body.password ?? ''), actor });
    return NextResponse.json({ customer });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not set customer password.' }, { status: 400 });
  }
}
