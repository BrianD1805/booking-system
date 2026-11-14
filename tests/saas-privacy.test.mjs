import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { isValidAvailabilityDate, publicBookingSlots, publicBootstrap } from '../lib/publicAvailability.mjs';

test('public availability requires one real calendar date', () => {
  for (const value of [null, '', '2026-02-29','2026-13-01','2026-11-14T00:00:00Z','2026-11-1']) assert.equal(isValidAvailabilityDate(value), false);
  assert.equal(isValidAvailabilityDate('2026-11-14'), true);
  assert.equal(isValidAvailabilityDate('2028-02-29'), true);
});

test('public occupied slots contain no private booking record fields', () => {
  const privateSlot = { own_id: null, id: 'private-booking-ref', practitioner_id: 'doctor', booking_date: '2026-11-17', start_time: '09:00:00', end_time: '09:30:00', patient_name: 'PRIVATE NAME', patient_email: 'PRIVATE EMAIL', customer_id: 'PRIVATE CUSTOMER', notes: 'PRIVATE NOTES', procedure_id: 'PRIVATE TREATMENT' };
  const [slot] = publicBookingSlots([privateSlot]);
  assert.equal(slot.id, 'occupied-0');
  assert.equal(slot.date, '2026-11-17');
  assert.equal(slot.time, '09:00');
  assert.equal(slot.endTime, '09:30');
  assert.equal(slot.status, 'confirmed');
  assert.equal(slot.patientName, '');
  assert.equal(slot.patientEmail, '');
  assert.equal(slot.customerId, undefined);
  assert.doesNotMatch(JSON.stringify(slot), /PRIVATE|private-booking-ref/);
});

test('existing signed-in clients can identify their own appointment for rescheduling', () => {
  const base = { practitioner_id: 'doctor', booking_date: '2026-11-17', start_time: '09:00:00', end_time: '09:30:00' };
  const slots = publicBookingSlots([{...base, own_id:'own-booking'}, {...base, own_id:null}]);
  assert.deepEqual(slots.map(s => s.id), ['own-booking','occupied-1']);
});

test('public bootstrap strips tenant metadata, staff leave reasons and inactive practitioners', () => {
  const input = {
    practiceSettings: { practiceId: 'private-practice', practiceName: 'Practice', tenantStatus: 'PRIVATE', subscriptionStatus: 'PRIVATE', adminAppUrl: 'PRIVATE', workingDays:[1,2,3], workingStartTime:'09:00', workingEndTime:'17:00', timezone:'Africa/Johannesburg' },
    procedures:[{id:'service',name:'Consultation',durationMinutes:30,privateNote:'PRIVATE'}],
    practitioners:[{id:'doctor',name:'Doctor',active:true,role:'Practitioner',displayOrder:1},{id:'inactive',name:'PRIVATE INACTIVE',active:false}],
    blockedDates:[{date:'2026-11-18',reason:'PRIVATE'}],
    blockedTimes:[{id:'PRIVATE',date:'2026-11-18',startTime:'12:00',endTime:'13:00',reason:'PRIVATE'}],
    practitionerWorkingHours:[{practitionerId:'doctor',dayOfWeek:1,active:true},{practitionerId:'inactive',dayOfWeek:1,active:true}],
    practitionerProcedures:[{practitionerId:'doctor',procedureId:'service'},{practitionerId:'inactive',procedureId:'service'}],
    practitionerBlockedTimes:[{id:'PRIVATE',practitionerId:'doctor',date:'2026-11-18',startTime:'12:00',endTime:'13:00',reason:'PRIVATE'}]
  };
  const result = publicBootstrap(input);
  assert.equal(result.practiceSettings.timezone,'Africa/Johannesburg');
  assert.deepEqual(result.practitioners.map(p=>p.id),['doctor']);
  assert.equal(result.practitionerProcedures.length,1);
  assert.equal(result.practitionerBlockedTimes[0].reason,'Unavailable');
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|private-practice/);
});

test('service worker never caches a private API response or falls back to old data offline', async () => {
  const listeners = new Map();
  let cacheCalls = 0;
  const request = {method:'GET',url:'https://zipbook.app/api/bookings?date=2026-11-17'};
  const response = {ok:true};
  let fetchOptions;
  const context = { URL, self:{location:new URL('https://zipbook.app/sw.js'),addEventListener:(name,handler)=>listeners.set(name,handler)}, caches:{open(){cacheCalls++;},match(){cacheCalls++;}},fetch:async (_request,options)=>{fetchOptions=options; return response;} };
  vm.runInNewContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),context);
  let result;
  listeners.get('fetch')({request,respondWith(promise){result=promise;}});
  assert.equal(await result,response);
  assert.equal(fetchOptions.cache,'no-store');
  assert.equal(cacheCalls,0);
  context.fetch=async()=>{throw new Error('offline')};
  listeners.get('fetch')({request,respondWith(promise){result=promise;}});
  await assert.rejects(result,/offline/);
  assert.equal(cacheCalls,0);
});

// Source contract checks, not live endpoint or database integration tests.
test('full booking read uses staff authorisation before the query; public query is scope-limited', () => {
  const route=readFileSync(new URL('../app/api/bookings/route.ts',import.meta.url),'utf8');
  const get=route.slice(route.indexOf('export async function GET'),route.indexOf('export async function POST'));
  assert.ok(get.indexOf('await requireAdminStaff(request)') >=0);
  assert.ok(get.indexOf('await requireAdminStaff(request)') < get.indexOf('await getBookings(date)'));
  const db=readFileSync(new URL('../lib/db.ts',import.meta.url),'utf8');
  const publicRead=db.slice(db.indexOf('export async function getPublicBookedSlots'),db.indexOf('export async function getClientBookingCustomerId'));
  assert.match(publicRead,/s\.customer_id = b\.customer_id/);
  assert.match(publicRead,/s\.practice_id = b\.practice_id/);
  assert.match(publicRead,/s\.revoked_at IS NULL AND s\.expires_at > NOW\(\)/);
  assert.match(publicRead,/b\.practice_id = \$\{PRACTICE_ID\} AND b\.booking_date/);
  assert.doesNotMatch(publicRead,/patient_name|patient_phone|patient_email|notes|procedure_id/);
});
