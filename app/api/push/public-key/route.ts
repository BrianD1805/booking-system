import { NextResponse } from 'next/server';
import { getPushPublicKey, isPushDeliveryConfigured } from '@/lib/pushDelivery';

export const dynamic = 'force-dynamic';

export async function GET() {
  const publicKey = getPushPublicKey();
  const response = NextResponse.json({
    ok: true,
    configured: isPushDeliveryConfigured(),
    publicKey
  });
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}
