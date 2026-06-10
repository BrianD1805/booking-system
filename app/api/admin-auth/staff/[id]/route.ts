import { NextRequest, NextResponse } from 'next/server';
import { deleteAdminStaffMember, updateAdminStaffMember } from '@/lib/db';
import { requireAdminStaff } from '@/lib/adminStaffAuth';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { actor } = await requireAdminStaff(request);
    const { id } = await context.params;
    const body = await request.json();
    const staff = await updateAdminStaffMember({
      id,
      fullName: String(body.fullName ?? ''),
      email: String(body.email ?? ''),
      phone: String(body.phone ?? ''),
      role: String(body.role ?? 'Reception'),
      active: body.active !== false,
      password: body.password ? String(body.password) : undefined,
      actor
    });
    return NextResponse.json({ staff });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update staff member.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { actor } = await requireAdminStaff(request);
    const { id } = await context.params;
    const confirm = request.nextUrl.searchParams.get('confirm') ?? '';
    if (confirm !== 'DELETE') {
      return NextResponse.json({ error: 'Add ?confirm=DELETE to confirm staff deletion.' }, { status: 400 });
    }
    await deleteAdminStaffMember({ id, actor });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not delete staff member.' }, { status: 400 });
  }
}
