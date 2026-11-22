import { withTenantRequest } from '@/lib/tenantRequest';
import { NextRequest, NextResponse } from 'next/server';
import { revokeClientSession } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  return withTenantRequest(request, async () => {
    const value = request.headers.get('authorization') ?? '';
    const token = value.toLowerCase().startsWith('bearer ') ? value.slice(7).trim() : '';
    if (!token) return NextResponse.json({ error: 'Client session required.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    try {
      await revokeClientSession(token);
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
      return NextResponse.json({ error: 'Could not sign out.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
  });
}
