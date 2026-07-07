import { NextResponse } from 'next/server';
import { getDefaultPracticeId } from '@/lib/tenant';
import { getZipBookDatabase, getZipBookDatabaseProvider } from '@/lib/dbProvider';
import { APP_VERSION } from '@/lib/domains';

export const dynamic = 'force-dynamic';

type CountRow = { count: number | string };
type PracticeRow = { id: string; name: string | null; tenant_slug: string | null };
type NowRow = { now: string; database_name: string | null };

function booleanEnv(value: string | undefined) {
  return value === '1' || value?.toLowerCase() === 'true';
}

function maskConnectionString(value: string | undefined) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    const host = url.host;
    const username = url.username ? `${url.username.slice(0, 12)}${url.username.length > 12 ? '…' : ''}` : '';
    return `${url.protocol}//${username ? `${username}:***@` : ''}${host}${url.pathname}`;
  } catch {
    return text.slice(0, 12) + '…';
  }
}

export async function GET() {
  const provider = getZipBookDatabaseProvider();
  const startedAt = Date.now();

  try {
    const database = getZipBookDatabase();
    const practiceId = getDefaultPracticeId();
    const [nowRows, practiceCountRows, demoPracticeRows, tenantDomainCountRows] = await Promise.all([
      database.sql<NowRow>`SELECT NOW()::text AS now, current_database()::text AS database_name`,
      database.sql<CountRow>`SELECT COUNT(*)::int AS count FROM practices`,
      database.sql<PracticeRow>`SELECT id, name, tenant_slug FROM practices WHERE id = ${practiceId} LIMIT 1`,
      database.sql<CountRow>`SELECT COUNT(*)::int AS count FROM tenant_domains`
    ]);

    const response = NextResponse.json({
      ok: true,
      version: APP_VERSION,
      provider,
      runtime: {
        databaseName: nowRows[0]?.database_name ?? null,
        databaseNow: nowRows[0]?.now ?? null,
        durationMs: Date.now() - startedAt
      },
      supabase: {
        configured: Boolean(process.env.SUPABASE_DB_POOLER_URL || process.env.SUPABASE_DATABASE_URL),
        poolerUrl: maskConnectionString(process.env.SUPABASE_DB_POOLER_URL || process.env.SUPABASE_DATABASE_URL),
        ssl: process.env.SUPABASE_DB_SSL === '0' ? 'off' : 'on',
        poolMax: Number(process.env.SUPABASE_DB_POOL_MAX ?? 3)
      },
      netlify: {
        defaultProvider: provider === 'netlify'
      },
      checks: {
        practices: Number(practiceCountRows[0]?.count ?? 0),
        tenantDomains: Number(tenantDomainCountRows[0]?.count ?? 0),
        defaultPracticeFound: Boolean(demoPracticeRows[0]),
        defaultPractice: demoPracticeRows[0] ?? null
      }
    });

    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (error) {
    const response = NextResponse.json(
      {
        ok: false,
        version: APP_VERSION,
        provider,
        durationMs: Date.now() - startedAt,
        supabase: {
          configured: Boolean(process.env.SUPABASE_DB_POOLER_URL || process.env.SUPABASE_DATABASE_URL),
          poolerUrl: maskConnectionString(process.env.SUPABASE_DB_POOLER_URL || process.env.SUPABASE_DATABASE_URL),
          usingSupabaseProvider: provider === 'supabase',
          envProviderSupabase: booleanEnv(process.env.DATABASE_PROVIDER === 'supabase' ? '1' : process.env.ZIPBOOK_DATABASE_PROVIDER === 'supabase' ? '1' : undefined)
        },
        error: error instanceof Error ? error.message : 'Database health check failed.'
      },
      { status: 500 }
    );
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  }
}
