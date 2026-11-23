import { NextResponse } from 'next/server';
import { APP_VERSION } from '@/lib/domains';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      version: APP_VERSION,
      removed: true,
      message: 'This temporary Netlify Database cleanup route has been retired. ZipBook is now locked to Supabase.'
    },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      version: APP_VERSION,
      removed: true,
      message: 'This temporary Netlify Database cleanup route has been retired. ZipBook is now locked to Supabase.'
    },
    { status: 410 }
  );
}
