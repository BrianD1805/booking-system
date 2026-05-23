import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@netlify/database';

export const dynamic = 'force-dynamic';

const PRACTICE_ID = 'practice_001';
const KEEP_NAME = 'Brian David Hallam';
const KEEP_PHONE = '+254701600529';
const TEST_DIGITS = ['254701600529', '0701600529', '701600529', '254707600529', '0707600529', '707600529'];
const CONFIRM_PHRASE = 'DELETE BRIAN TEST DATA';

type QueryRow = Record<string, unknown>;

function database() {
  return getDatabase();
}

function isAuthorised(request: NextRequest) {
  const configuredKey = process.env.ZIPBOOK_CLEANUP_KEY;
  if (!configuredKey) return false;

  const queryKey = request.nextUrl.searchParams.get('key') ?? '';
  const headerKey = request.headers.get('x-zipbook-cleanup-key') ?? '';
  return queryKey === configuredKey || headerKey === configuredKey;
}

function rowCount(result: unknown) {
  const maybe = result as { rowCount?: number; rows?: unknown[] };
  if (typeof maybe?.rowCount === 'number') return maybe.rowCount;
  if (Array.isArray(maybe?.rows)) return maybe.rows.length;
  return 0;
}

function rows<T = QueryRow>(result: unknown): T[] {
  const maybe = result as { rows?: T[] };
  return Array.isArray(maybe?.rows) ? maybe.rows : [];
}

async function getPreview() {
  const db = database();
  const candidateCustomers = await db.sql`
    SELECT id, full_name, phone, email, has_client_login, created_at::text AS created_at
    FROM customers
    WHERE practice_id = ${PRACTICE_ID}
      AND (
        regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = ANY(${TEST_DIGITS})
        OR lower(full_name) LIKE '%brian%'
      )
    ORDER BY created_at DESC;
  `;

  const candidateBookings = await db.sql`
    SELECT id, patient_name, patient_phone, patient_email, booking_date::text AS booking_date,
      start_time::text AS start_time, customer_id, status
    FROM bookings
    WHERE practice_id = ${PRACTICE_ID}
      AND (
        regexp_replace(coalesce(patient_phone, ''), '[^0-9]', '', 'g') = ANY(${TEST_DIGITS})
        OR lower(patient_name) LIKE '%brian%'
      )
    ORDER BY booking_date DESC, start_time DESC;
  `;

  return {
    keep: { fullName: KEEP_NAME, phone: KEEP_PHONE },
    candidateCustomers: rows(candidateCustomers),
    candidateBookings: rows(candidateBookings)
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: 'Cleanup key missing or incorrect.' }, { status: 401 });
  }

  try {
    return NextResponse.json({ ok: true, mode: 'preview', ...(await getPreview()) });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not preview Brian test data cleanup.'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: 'Cleanup key missing or incorrect.' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    if (body?.confirm !== CONFIRM_PHRASE || body?.keepPhone !== KEEP_PHONE) {
      return NextResponse.json({
        error: `For safety, send confirm="${CONFIRM_PHRASE}" and keepPhone="${KEEP_PHONE}".`
      }, { status: 400 });
    }

    const db = database();
    const before = await getPreview();

    const keepCustomerResult = await db.sql`
      SELECT id
      FROM customers
      WHERE practice_id = ${PRACTICE_ID}
        AND lower(full_name) = lower(${KEEP_NAME})
        AND phone = ${KEEP_PHONE}
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const keepCustomerId = rows<{ id: string }>(keepCustomerResult)[0]?.id ?? null;

    if (!keepCustomerId) {
      return NextResponse.json({
        error: `Could not find the clean customer record to keep: ${KEEP_NAME}, ${KEEP_PHONE}. Nothing has been deleted.`,
        before
      }, { status: 404 });
    }

    const purgeCustomersResult = await db.sql`
      SELECT id
      FROM customers
      WHERE practice_id = ${PRACTICE_ID}
        AND id <> ${keepCustomerId}
        AND (
          regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = ANY(${TEST_DIGITS})
          OR lower(full_name) LIKE '%brian%'
        );
    `;
    const purgeCustomerIds = rows<{ id: string }>(purgeCustomersResult).map((row) => row.id);

    const deleteBookingsForPurgeCustomers = purgeCustomerIds.length
      ? await db.sql`
          DELETE FROM bookings
          WHERE practice_id = ${PRACTICE_ID}
            AND customer_id = ANY(${purgeCustomerIds});
        `
      : { rowCount: 0 };

    const deleteLooseTestBookings = await db.sql`
      DELETE FROM bookings
      WHERE practice_id = ${PRACTICE_ID}
        AND customer_id IS DISTINCT FROM ${keepCustomerId}
        AND (
          regexp_replace(coalesce(patient_phone, ''), '[^0-9]', '', 'g') = ANY(${TEST_DIGITS})
          OR lower(patient_name) LIKE '%brian%'
        );
    `;

    const deletePurgeCustomers = purgeCustomerIds.length
      ? await db.sql`
          DELETE FROM customers
          WHERE practice_id = ${PRACTICE_ID}
            AND id = ANY(${purgeCustomerIds});
        `
      : { rowCount: 0 };

    const after = await getPreview();

    return NextResponse.json({
      ok: true,
      mode: 'deleted',
      keptCustomerId: keepCustomerId,
      deleted: {
        bookingsLinkedToDuplicateCustomers: rowCount(deleteBookingsForPurgeCustomers),
        looseTestBookings: rowCount(deleteLooseTestBookings),
        duplicateCustomers: rowCount(deletePurgeCustomers)
      },
      before,
      after
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not run Brian test data cleanup.'
    }, { status: 500 });
  }
}
