import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bookingCreateError } from '../lib/publicBookingCreatePolicy.mjs';
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('concurrent database slot conflict has safe 409 without SQL details', () => {
  assert.deepEqual(bookingCreateError({code:'23P01',message:'SQL: private customer details'}), {
    status:409,message:'That time has just been taken. Please choose another available slot.'
  });
  assert.equal(bookingCreateError(new Error('That practitioner already has a booking at this time. Please choose another available slot.')).status,409);
  assert.deepEqual(bookingCreateError({code:'XX000',message:'SELECT patient_email FROM private_schema'}), {
    status:500,message:'Could not create booking. Please try again.'
  });
  assert.equal(bookingCreateError(new Error('The selected service is no longer available. Please choose an active service.')).status,400);
});

test('tenant-specific public API gates remain closed until explicit publication',()=>{
  const provider=read('lib/dbProvider.ts'),tenant=read('lib/tenantRequest.ts');
  const bootstrap=read('app/api/bootstrap/route.ts'),availability=read('app/api/availability/route.ts'),booking=read('app/api/bookings/route.ts');
  assert.match(provider,/defaultId !== null \|\| row.onboarding_completed === true/);
  assert.match(tenant,/classifyTenantHost\(request.headers.get\('host'\)/);
  assert.match(tenant,/lookupTenant\(host.kind === 'legacy'/);
  assert.match(bootstrap,/!adminView && currentTenant\(\)\.publicBookings === false/);
  assert.match(availability,/currentTenant\(\)\.publicBookings === false/);
  assert.match(booking,/source === 'client' && currentTenant\(\)\.publicBookings === false/);
  assert.match(booking,/bookingCreateError\(error\)/);
  assert.match(read('lib/platformStore.ts'),/action:'activate'\|'publish'\|'suspend'/);
  assert.match(read('lib/platformStore.ts'),/SET onboarding_completed=true/);
  assert.match(read('app/api/platform/businesses/route.ts'),/body.confirmed!==true/);
});

test('booking writes use the authenticated/resolved business and require an active service',()=>{
  const db=read('lib/db.ts'), booking=db.slice(db.indexOf('export async function createBookingInDatabase'),db.indexOf('type BookingDetailsInput'));
  const route=read('app/api/bookings/route.ts');
  assert.match(booking,/bootstrap.procedures.find\(\(item\) => item.id === input.procedureId\)/);
  assert.match(booking,/if \(!activeService\) throw new Error/);
  assert.match(booking,/\$\{currentTenant\(\)\.practiceId\}/);
  assert.match(db,/INNER JOIN procedures svc ON svc.id = pp.procedure_id AND svc.practice_id = p.practice_id AND svc.active = TRUE/);
  assert.match(route,/getClientBookingCustomerId\(token\)/);
  assert.match(route,/customerId && customerId !== authenticatedId/);
  assert.match(route,/else if \(customerId\)/);
});

test('database trigger serialises appointments and rejects overlaps within each practice',()=>{
  const sql=read('supabase/zipbook_public_bookings_ver_0_062.sql');
  assert.match(sql,/SECURITY INVOKER/);
  assert.match(sql,/pg_advisory_xact_lock/);
  assert.match(sql,/NEW.practice_id \|\| ':' \|\| NEW.practitioner_id/);
  assert.match(sql,/b.practice_id = NEW.practice_id/);
  assert.match(sql,/b.practitioner_id = NEW.practitioner_id/);
  assert.match(sql,/b.booking_date = NEW.booking_date/);
  assert.match(sql,/b.status <> 'cancelled'/);
  assert.match(sql,/b.start_time < NEW.end_time/);
  assert.match(sql,/NEW.start_time < b.end_time/);
  assert.match(sql,/ERRCODE = '23P01'/);
  assert.match(sql,/BEFORE INSERT OR UPDATE OF/);
  assert.doesNotMatch(sql,/DISABLE ROW LEVEL SECURITY|SECURITY DEFINER/);
});

test('public APIs keep private appointment data out of guest availability and no service worker cache',()=>{
  const db=read('lib/db.ts'),start=db.indexOf('export async function getPublicBookedSlots'),end=db.indexOf('export async function getClientBookingCustomerId');
  assert.match(db.slice(start,end),/b.practice_id = \$\{currentTenant\(\)\.practiceId\}/);
  assert.doesNotMatch(db.slice(start,end),/b.patient_name|b.patient_phone|b.patient_email/);
  assert.match(read('public/sw.js'),/url.pathname.startsWith\('\/api\/'\)/);
  assert.match(read('lib/publicAvailability.mjs'),/patientName: '', patientPhone: '', patientEmail: ''/);
});

test('new-business customer confirmation identifies the correct business without changing legacy mail',()=>{
  const db=read('lib/db.ts'), email=read('lib/emailDelivery.ts');
  assert.match(db,/businessName: bootstrap.practiceSettings.practiceName/);
  assert.match(db,/currentTenant\(\)\.legacy\s*\?/);
  assert.match(email,/businessName\?: string/);
  assert.match(email,/\['Business', business\]/);
  assert.match(email,/business \? 'Service' : 'Procedure'/);
  assert.match(email,/escapeHtml\(business\)/);
});
