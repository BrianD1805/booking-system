import { NextResponse } from 'next/server';
import { getBootstrapData } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getBootstrapData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not load Netlify Database bootstrap data.'
    }, { status: 500 });
  }
}
