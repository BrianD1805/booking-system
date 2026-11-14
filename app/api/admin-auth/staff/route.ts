import { currentTenant } from '@/lib/tenantScope.mjs';
import { withTenantRequest } from '@/lib/tenantRequest';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminDataKey } from '@/lib/adminDataAuth';
import { countAdminStaffMembers, createAdminStaffMember, listAdminStaffMembers } from '@/lib/db';
import { readAdminActorRequestMeta, requireAdminStaff, requireBusinessOwner } from '@/lib/adminStaffAuth';

export const dynamic = 'force-dynamic';

async function optionalActor(request: NextRequest) {
  try {
    const { actor } = await requireAdminStaff(request);
    return actor;
  } catch {
    return { source: 'master-key-setup', ...readAdminActorRequestMeta(request) };
  }
}

export async function GET(request: NextRequest) {
  return withTenantRequest(request, async () => {
  try {
    await requireBusinessOwner(request);
    const staff = await listAdminStaffMembers();
    return NextResponse.json({ staff });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load staff.' }, { status: 401 });
  }
  });
}

export async function POST(request: NextRequest) {
  return withTenantRequest(request, async () => {
  if (currentTenant().legacy && !verifyAdminDataKey(request)) {
    return NextResponse.json({ error: 'Master admin key is required.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const staffCount = await countAdminStaffMembers();
    if (!currentTenant().legacy || staffCount > 0) {
      await requireBusinessOwner(request);
    }
    const staff = await createAdminStaffMember({
      fullName: String(body.fullName ?? ''),
      email: String(body.email ?? ''),
      phone: String(body.phone ?? ''),
      role: String(body.role ?? 'Reception'),
      password: String(body.password ?? ''),
      active: body.active !== false,
      actor: await optionalActor(request)
    });
    return NextResponse.json({ staff }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create staff member.' }, { status: 400 });
  }
  });
}
