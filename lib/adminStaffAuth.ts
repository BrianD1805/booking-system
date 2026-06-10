import { NextRequest } from 'next/server';
import { getAdminStaffBySession, type AdminActor, type AdminStaffMember } from '@/lib/db';
import { verifyAdminDataKey } from '@/lib/adminDataAuth';

export function readAdminActorRequestMeta(request: NextRequest): Pick<AdminActor, 'requestIp' | 'userAgent'> {
  return {
    requestIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined,
    userAgent: request.headers.get('user-agent') || undefined
  };
}

export function readStaffToken(request: NextRequest) {
  return request.headers.get('x-zipbook-staff-token') ?? request.cookies.get('zipbook_staff_token')?.value ?? '';
}

export async function requireAdminStaff(request: NextRequest): Promise<{ staff: AdminStaffMember; actor: AdminActor }> {
  if (!verifyAdminDataKey(request)) throw new Error('Master admin key is required.');
  const staff = await getAdminStaffBySession(readStaffToken(request));
  if (!staff) throw new Error('Staff login is required.');
  return {
    staff,
    actor: {
      staffId: staff.id,
      staffName: staff.fullName,
      source: 'staff',
      ...readAdminActorRequestMeta(request)
    }
  };
}
