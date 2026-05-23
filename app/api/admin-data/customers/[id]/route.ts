import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminDataKey } from '@/lib/adminDataAuth';
import { deleteAdminDataCustomerAndBookings, updateAdminDataCustomer } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!verifyAdminDataKey(request)) {
    return NextResponse.json({ error: 'Admin data key is required.' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const customer = await updateAdminDataCustomer({
      id,
      fullName: String(body.fullName ?? ''),
      phone: String(body.phone ?? ''),
      email: String(body.email ?? ''),
      notes: String(body.notes ?? '')
    });
    return NextResponse.json({ customer });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update customer.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!verifyAdminDataKey(request)) {
    return NextResponse.json({ error: 'Admin data key is required.' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const confirm = request.nextUrl.searchParams.get('confirm') ?? '';
    if (confirm !== 'DELETE') {
      return NextResponse.json({ error: 'Add ?confirm=DELETE to confirm customer and booking deletion.' }, { status: 400 });
    }
    const result = await deleteAdminDataCustomerAndBookings(id);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not delete customer data.' }, { status: 400 });
  }
}
