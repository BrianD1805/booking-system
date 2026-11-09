import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ZIPBOOK_HEARTBEAT_ID,
  ZIPBOOK_HEARTBEAT_UPSERT,
  writeZipBookHeartbeat
} from '../lib/supabaseHeartbeat.mjs';

test('heartbeat always targets exactly one fixed row using a parameter', async () => {
  let calls = 0;
  const result = await writeZipBookHeartbeat(async (sql, values) => {
    calls += 1;
    assert.equal(sql, ZIPBOOK_HEARTBEAT_UPSERT);
    assert.deepEqual(values, ['zipbook-primary']);
    assert.match(sql, /ON CONFLICT \(id\) DO UPDATE/i);
    assert.match(sql, /run_count\s*=\s*public\.zipbook_system_heartbeat\.run_count\s*\+\s*1/i);
    return { rows: [{ last_ping_at: new Date('2026-11-09T15:15:00Z'), run_count: '12' }] };
  });
  assert.equal(calls, 1);
  assert.equal(ZIPBOOK_HEARTBEAT_ID, 'zipbook-primary');
  assert.deepEqual(result, { lastPingAt: '2026-11-09T15:15:00.000Z', runCount: '12' });
});

test('heartbeat rejects an empty database response', async () => {
  await assert.rejects(() => writeZipBookHeartbeat(async () => ({ rows: [] })), /updated timestamp/);
});

test('heartbeat rejects invalid timestamps', async () => {
  await assert.rejects(() => writeZipBookHeartbeat(async () => ({
    rows: [{ last_ping_at: 'not-a-date', run_count: '1' }]
  })), /invalid timestamp/);
});

test('heartbeat propagates database errors to Netlify', async () => {
  await assert.rejects(() => writeZipBookHeartbeat(async () => {
    throw new Error('connection unavailable');
  }), /connection unavailable/);
});
