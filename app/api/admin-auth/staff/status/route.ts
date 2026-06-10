import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminDataKey } from '@/lib/adminDataAuth';
import { countAdminStaffMembers, getAdminStaffBySession } from '@/lib/db';
import { readStaffToken } from '@/lib/adminStaffAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!verifyAdminDataKey(request)) {
    return NextResponse.json({ error: 'Master admin key is required.' }, { status: 401 });
  }

  try {
    const [staffCount, staff] = await Promise.all([
      countAdminStaffMembers(),
      getAdminStaffBySession(readStaffToken(request))
    ]);
    return NextResponse.json({ staffCount, staff, authenticated: Boolean(staff) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not check admin staff status.' }, { status: 500 });
  }
}
