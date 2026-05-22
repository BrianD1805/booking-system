import { NextRequest, NextResponse } from 'next/server';
import { getClientProfileBySession } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') ?? '';
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '';
    const queryToken = request.nextUrl.searchParams.get('token') ?? '';
    const profile = await getClientProfileBySession(bearerToken || queryToken);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Client session not available.'
    }, { status: 401 });
  }
}
