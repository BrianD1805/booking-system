import { NextRequest, NextResponse } from 'next/server';
import { createAdminDataCustomer, listAdminDataCustomers } from '@/lib/db';
import { requireAdminStaff } from '@/lib/adminStaffAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdminStaff(request);
    const query = request.nextUrl.searchParams.get('query') ?? '';
    const customers = await listAdminDataCustomers(query);
    return NextResponse.json({ customers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load client data.' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { actor } = await requireAdminStaff(request);
    const body = await request.json();
    const customer = await createAdminDataCustomer({
      fullName: String(body.fullName ?? ''),
      phone: String(body.phone ?? ''),
      email: String(body.email ?? ''),
      notes: String(body.notes ?? ''),
      dateOfBirth: String(body.dateOfBirth ?? ''),
      idPassportInfo: String(body.idPassportInfo ?? ''),
      address: String(body.address ?? ''),
      medicalInsuranceName: String(body.medicalInsuranceName ?? ''),
      notificationAppPush: Boolean(body.notificationAppPush),
      notificationEmail: Boolean(body.notificationEmail),
      notificationSms: Boolean(body.notificationSms),
      emergencyContactName: String(body.emergencyContactName ?? ''),
      emergencyContactPhone: String(body.emergencyContactPhone ?? ''),
      allergiesMedicalAlerts: String(body.allergiesMedicalAlerts ?? ''),
      preferredLanguage: String(body.preferredLanguage ?? ''),
      preferredContactTime: String(body.preferredContactTime ?? ''),
      familyMembers: Array.isArray(body.familyMembers) ? body.familyMembers : [],
      documents: Array.isArray(body.documents) ? body.documents : [],
      actor
    });
    return NextResponse.json({ customer });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create client.' }, { status: 400 });
  }
}
