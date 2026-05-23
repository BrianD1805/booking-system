import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminDataKey } from '@/lib/adminDataAuth';
import { setAdminDataCustomerPassword } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!verifyAdminDataKey(request)) {
    return NextResponse.json({ error: 'Admin data key is required.' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const customer = await setAdminDataCustomerPassword({ customerId: id, password: String(body.password ?? '') });
    return NextResponse.json({ customer });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not set customer password.' }, { status: 400 });
  }
}
