import { getDatabase } from '@netlify/database';
import { Pool, type PoolConfig } from 'pg';

type SqlQueryResult<T> = T[];

type SqlTag = <T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<SqlQueryResult<T>>;

export type ZipBookDatabase = {
  sql: SqlTag;
  provider: 'netlify' | 'supabase';
};

type NetlifyDatabaseLike = {
  sql: SqlTag;
};

let supabasePool: Pool | null = null;

function selectedProvider() {
  const raw = (process.env.DATABASE_PROVIDER ?? process.env.ZIPBOOK_DATABASE_PROVIDER ?? 'netlify').trim().toLowerCase();
  return raw === 'supabase' ? 'supabase' : 'netlify';
}

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
    throw new Error('DATABASE_PROVIDER is set to supabase, but SUPABASE_DB_POOLER_URL is not configured.');
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

function createSupabaseDatabase(): ZipBookDatabase {
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

function createNetlifyDatabase(): ZipBookDatabase {
  const database = getDatabase() as unknown as NetlifyDatabaseLike;
  return {
    provider: 'netlify',
    sql: database.sql
  };
}

export function getZipBookDatabase(): ZipBookDatabase {
  return selectedProvider() === 'supabase' ? createSupabaseDatabase() : createNetlifyDatabase();
}

export function getZipBookDatabaseProvider() {
  return selectedProvider();
}
