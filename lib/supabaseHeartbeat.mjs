/**
 * ZipBook's single-row Supabase activity heartbeat.
 * Kept separate from the Netlify handler so the SQL can be tested without a live database.
 */
export const ZIPBOOK_HEARTBEAT_ID = 'zipbook-primary';

export const ZIPBOOK_HEARTBEAT_UPSERT = `
  INSERT INTO public.zipbook_system_heartbeat (id, last_ping_at, run_count)
  VALUES ($1, NOW(), 1)
  ON CONFLICT (id) DO UPDATE SET
    last_ping_at = EXCLUDED.last_ping_at,
    run_count = public.zipbook_system_heartbeat.run_count + 1
  RETURNING last_ping_at, run_count
`;

export async function writeZipBookHeartbeat(query) {
  const result = await query(ZIPBOOK_HEARTBEAT_UPSERT, [ZIPBOOK_HEARTBEAT_ID]);
  const row = result?.rows?.[0];
  if (!row?.last_ping_at) {
    throw new Error('Supabase heartbeat did not return its updated timestamp.');
  }

  const lastPingAt = new Date(row.last_ping_at);
  if (!Number.isFinite(lastPingAt.getTime())) {
    throw new Error('Supabase heartbeat returned an invalid timestamp.');
  }

  return {
    lastPingAt: lastPingAt.toISOString(),
    runCount: String(row.run_count)
  };
}
