import { NextResponse, type NextRequest } from 'next/server';
import { getDefaultPracticeId } from '@/lib/tenant';
import { getZipBookDatabase, getZipBookDatabaseProvider } from '@/lib/dbProvider';
import { APP_VERSION } from '@/lib/domains';

export const dynamic = 'force-dynamic';

type CountRow = { count: number | string };
type PracticeRow = { id: string; name: string | null; tenant_slug: string | null };
type NowRow = { now: string; database_name: string | null };
type SmokeRow = { table_name: string; row_count: number | string };

const FULL_API_TABLES = [
  'practices',
  'tenant_domains',
  'procedures',
  'practitioners',
  'practitioner_working_hours',
  'practitioner_procedures',
  'bookings',
  'customers',
  'customer_family_members',
  'customer_documents',
  'client_accounts',
  'client_sessions',
  'client_login_otps',
  'admin_staff_members',
  'admin_staff_sessions',
  'audit_logs'
];

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

function hasSupabaseEnv() {
  return Boolean(process.env.SUPABASE_DB_POOLER_URL || process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL);
}

async function getSmokeChecks() {
  const database = getZipBookDatabase();
  const rows = await database.sql<SmokeRow>`
    SELECT
      table_name,
      (
        CASE table_name
          WHEN 'practices' THEN (SELECT COUNT(*) FROM practices)
          WHEN 'tenant_domains' THEN (SELECT COUNT(*) FROM tenant_domains)
          WHEN 'procedures' THEN (SELECT COUNT(*) FROM procedures)
          WHEN 'practitioners' THEN (SELECT COUNT(*) FROM practitioners)
          WHEN 'practitioner_working_hours' THEN (SELECT COUNT(*) FROM practitioner_working_hours)
          WHEN 'practitioner_procedures' THEN (SELECT COUNT(*) FROM practitioner_procedures)
          WHEN 'bookings' THEN (SELECT COUNT(*) FROM bookings)
          WHEN 'customers' THEN (SELECT COUNT(*) FROM customers)
          WHEN 'customer_family_members' THEN (SELECT COUNT(*) FROM customer_family_members)
          WHEN 'customer_documents' THEN (SELECT COUNT(*) FROM customer_documents)
          WHEN 'client_accounts' THEN (SELECT COUNT(*) FROM client_accounts)
          WHEN 'client_sessions' THEN (SELECT COUNT(*) FROM client_sessions)
          WHEN 'client_login_otps' THEN (SELECT COUNT(*) FROM client_login_otps)
          WHEN 'admin_staff_members' THEN (SELECT COUNT(*) FROM admin_staff_members)
          WHEN 'admin_staff_sessions' THEN (SELECT COUNT(*) FROM admin_staff_sessions)
          WHEN 'audit_logs' THEN (SELECT COUNT(*) FROM audit_logs)
          ELSE 0
        END
      )::int AS row_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY(${FULL_API_TABLES}::text[])
    ORDER BY table_name
  `;

  const present = new Set(rows.map((row) => row.table_name));
  const missing = FULL_API_TABLES.filter((tableName) => !present.has(tableName));

  return {
    ok: missing.length === 0,
    checkedTables: rows.map((row) => ({
      table: row.table_name,
      rows: Number(row.row_count ?? 0)
    })),
    missingTables: missing
  };
}

export async function GET(request: NextRequest) {
  const provider = getZipBookDatabaseProvider();
  const startedAt = Date.now();
  const includeSmoke = request.nextUrl.searchParams.get('smoke') === '1';

  try {
    const database = getZipBookDatabase();
    const practiceId = getDefaultPracticeId();
    const [nowRows, practiceCountRows, demoPracticeRows, tenantDomainCountRows] = await Promise.all([
      database.sql<NowRow>`SELECT NOW()::text AS now, current_database()::text AS database_name`,
      database.sql<CountRow>`SELECT COUNT(*)::int AS count FROM practices`,
      database.sql<PracticeRow>`SELECT id, name, tenant_slug FROM practices WHERE id = ${practiceId} LIMIT 1`,
      database.sql<CountRow>`SELECT COUNT(*)::int AS count FROM tenant_domains`
    ]);

    const smoke = includeSmoke ? await getSmokeChecks() : undefined;

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
        configured: hasSupabaseEnv(),
        poolerUrl: maskConnectionString(process.env.SUPABASE_DB_POOLER_URL || process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL),
        ssl: process.env.SUPABASE_DB_SSL === '0' ? 'off' : 'on',
        poolMax: Number(process.env.SUPABASE_DB_POOL_MAX ?? 3)
      },
      netlify: {
        defaultProvider: provider === 'netlify'
      },
      cutover: {
        fullApiProviderLayer: true,
        remainingDirectNetlifyRoutes: 0,
        note: 'All server database work now runs through the ZipBook provider layer. Set DATABASE_PROVIDER=supabase to test Supabase.'
      },
      checks: {
        practices: Number(practiceCountRows[0]?.count ?? 0),
        tenantDomains: Number(tenantDomainCountRows[0]?.count ?? 0),
        defaultPracticeFound: Boolean(demoPracticeRows[0]),
        defaultPractice: demoPracticeRows[0] ?? null
      },
      smoke
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
          configured: hasSupabaseEnv(),
          poolerUrl: maskConnectionString(process.env.SUPABASE_DB_POOLER_URL || process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL),
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
