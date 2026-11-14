import { currentTenant } from './tenantScope.mjs';
import { Pool, type PoolConfig } from 'pg';

type SqlQueryResult<T> = T[];

type SqlTag = <T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<SqlQueryResult<T>>;

export type ZipBookDatabase = {
  sql: SqlTag;
  provider: 'supabase';
};

let supabasePool: Pool | null = null;

function getSupabaseConnectionString() {
  return (
    process.env.SUPABASE_DB_POOLER_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.DATABASE_URL ||
    ''
  ).trim();
}

function getSupabasePool() {
  if (supabasePool) return supabasePool;

  const connectionString = getSupabaseConnectionString();
  if (!connectionString) {
    throw new Error('ZipBook is now locked to Supabase. Configure SUPABASE_DB_POOLER_URL with the Supabase transaction pooler connection string.');
  }

  const poolConfig: PoolConfig = {
    connectionString,
    max: Number(process.env.SUPABASE_DB_POOL_MAX ?? 3),
    idleTimeoutMillis: Number(process.env.SUPABASE_DB_IDLE_TIMEOUT_MS ?? 10000),
    connectionTimeoutMillis: Number(process.env.SUPABASE_DB_CONNECTION_TIMEOUT_MS ?? 10000)
  };

  if (process.env.SUPABASE_DB_SSL !== '0' && !connectionString.includes('localhost')) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  supabasePool = new Pool(poolConfig);
  return supabasePool;
}

function buildParameterizedQuery(strings: TemplateStringsArray, values: unknown[]) {
  let text = '';
  strings.forEach((chunk, index) => {
    text += chunk;
    if (index < values.length) text += `$${index + 1}`;
  });
  return { text, values };
}

export function getZipBookDatabase(): ZipBookDatabase {
  return {
    provider: 'supabase',
    async sql<T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]) {
      const pool = getSupabasePool();
      const query = buildParameterizedQuery(strings, values);
      const tenant = currentTenant();
      const connection = await pool.connect();
      let discard = false;
      try {
        await connection.query('BEGIN');
        await connection.query('SET LOCAL ROLE zipbook_tenant_runtime');
        await connection.query("SELECT set_config('zipbook.practice_id', $1, true), set_config('search_path', 'public, pg_catalog', true)", [tenant.practiceId]);
        const result = await connection.query(query.text, query.values);
        await connection.query('COMMIT');
        return result.rows as T[];
      } catch (error) {
        try { await connection.query('ROLLBACK'); } catch { discard = true; }
        throw error;
      } finally {
        connection.release(discard);
      }
    }
  };
}

export function getZipBookDatabaseProvider() {
  return 'supabase' as const;
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseConnectionString());
}

export function getMaskedSupabaseConnectionString() {
  const text = getSupabaseConnectionString();
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

// Only this narrow resolver uses the connection role. All booking queries must use the scoped role above.
export async function lookupTenant(defaultId: string | null, slug: string | null) {
  const result = await getSupabasePool().query<{practice_id:string; tenant_slug:string; practice_name:string}>(
    'SELECT * FROM public.zipbook_resolve_business($1, $2)', [defaultId, slug]);
  const row = result.rows[0];
  return row ? {practiceId:row.practice_id,tenantSlug:row.tenant_slug,name:row.practice_name} : null;
}
