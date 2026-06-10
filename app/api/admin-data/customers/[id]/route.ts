import { NextRequest, NextResponse } from 'next/server';
import { deleteAdminDataCustomerAndBookings, getAdminDataCustomerById, updateAdminDataCustomer } from '@/lib/db';
import { requireAdminStaff } from '@/lib/adminStaffAuth';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminStaff(request);
    const { id } = await context.params;
    const customer = await getAdminDataCustomerById(id);
    if (!customer) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }
    return NextResponse.json({ customer });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load client.' }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { actor } = await requireAdminStaff(request);
    const { id } = await context.params;
    const body = await request.json();
    const customer = await updateAdminDataCustomer({
      id,
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
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update client.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { actor } = await requireAdminStaff(request);
    const { id } = await context.params;
    const confirm = request.nextUrl.searchParams.get('confirm') ?? '';
    if (confirm !== 'DELETE') {
      return NextResponse.json({ error: 'Add ?confirm=DELETE to confirm client and booking deletion.' }, { status: 400 });
    }
    const result = await deleteAdminDataCustomerAndBookings(id, actor);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not delete client data.' }, { status: 400 });
  }
}
