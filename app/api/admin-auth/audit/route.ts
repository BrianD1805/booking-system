import { NextRequest, NextResponse } from 'next/server';
import { listAdminAuditLogs } from '@/lib/db';
import { requireAdminStaff } from '@/lib/adminStaffAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdminStaff(request);
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? 100);
    const audit = await listAdminAuditLogs(limit);
    return NextResponse.json({ audit });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load audit trail.' }, { status: 401 });
  }
}
