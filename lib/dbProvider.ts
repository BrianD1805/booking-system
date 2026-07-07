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
      const result = await pool.query(query.text, query.values);
      return result.rows as T[];
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
