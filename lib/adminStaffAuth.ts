import { currentTenant } from './tenantScope.mjs';
import { NextRequest } from 'next/server';
import { getAdminStaffBySession, type AdminActor, type AdminStaffMember } from '@/lib/db';
import { verifyAdminDataKey } from '@/lib/adminDataAuth';
import {getDemoSession,isRealDemoTenant,demoDiaryApiPermitted,demoVirtualStaff} from '@/lib/publicDemoAuth';

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
  // The legacy master key and real staff token always take priority.
  const hasMaster=!currentTenant().legacy || verifyAdminDataKey(request);
  if(hasMaster) {
    const staff=await getAdminStaffBySession(readStaffToken(request));
    if(staff) return {staff,actor:{staffId:staff.id,staffName:staff.fullName,source:'staff',...readAdminActorRequestMeta(request)}};
  }
  // Demo access is an explicit visitor capability, NOT a real staff account.
  // Exact host, tenant, TTL, method and route must all match.
  if(isRealDemoTenant() && getDemoSession(request) &&
     demoDiaryApiPermitted(request.nextUrl.pathname,request.method)) {
    const staff=demoVirtualStaff();
    return {staff,actor:{staffName:'Demo Reception',source:'demo',...readAdminActorRequestMeta(request)}};
  }
  if(currentTenant().legacy && !hasMaster) throw new Error('Master admin key is required.');
  throw new Error('Staff login is required.');
}

export async function requireBusinessOwner(request: NextRequest) {
  const result = await requireAdminStaff(request);
  if (result.staff.role === 'Demo / Reception') throw new Error('Demo access cannot change protected settings.');
  if (!currentTenant().legacy && result.staff.role !== 'Owner') throw new Error('Business owner access is required.');
  return result;
}
