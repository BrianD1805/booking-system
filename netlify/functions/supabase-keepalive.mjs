import pg from 'pg';
import { writeZipBookHeartbeat } from '../../lib/supabaseHeartbeat.mjs';

const { Pool } = pg;

/**
 * Runs only as a Netlify Scheduled Function (schedule in netlify.toml).
 * Uses ZipBook's existing Supabase transaction-pooler connection settings.
 */
export default async function supabaseKeepalive() {
  const connectionString = (
    process.env.SUPABASE_DB_POOLER_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.DATABASE_URL ||
    ''
  ).trim();

  if (!connectionString) {
    throw new Error('ZipBook heartbeat: SUPABASE_DB_POOLER_URL is not configured.');
  }

  const poolOptions = {
    connectionString,
    max: 1,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 1000,
    query_timeout: 10000
  };

  if (process.env.SUPABASE_DB_SSL !== '0' && !connectionString.includes('localhost')) {
    poolOptions.ssl = { rejectUnauthorized: false };
  }

  const pool = new Pool(poolOptions);
  try {
    const result = await writeZipBookHeartbeat((sql, values) => pool.query(sql, values));
    console.info(`ZipBook Supabase heartbeat OK: ${result.lastPingAt} (run ${result.runCount}).`);
    return new Response('Heartbeat updated', { status: 200 });
  } catch (error) {
    // No connection strings or credentials in logs.
    console.error('ZipBook Supabase heartbeat failed:', error instanceof Error ? error.message : 'Unknown error');
    throw error; // Mark the scheduled invocation as failed in Netlify logs.
  } finally {
    await pool.end();
  }
}
