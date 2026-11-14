// Explicit public projections: never spread a private database record.
export function isValidAvailabilityDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function publicBookingSlots(rows) {
  // Compatibility with the shared Booking type; all personal and audit fields
  // are empty placeholders, and all external appointment IDs are synthetic.
  return rows.map((row, index) => ({
    id: row.own_id || `occupied-${index}`,
    practitionerId: row.practitioner_id,
    date: row.booking_date.slice(0, 10),
    time: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    status: 'confirmed',
    patientName: '', patientPhone: '', patientEmail: '', procedureId: '',
    source: 'client', createdAt: '', updatedAt: ''
  }));
}

export function publicBootstrap(data) {
  const p = data.practiceSettings;
  return {
    practiceSettings: {
      practiceId: '', practiceName: p.practiceName, bookingSubdomain: '', reminderOptions: [],
      workingDays: p.workingDays, workingStartTime: p.workingStartTime, workingEndTime: p.workingEndTime,
      lunchBreakEnabled: p.lunchBreakEnabled, lunchBreakStart: p.lunchBreakStart, lunchBreakEnd: p.lunchBreakEnd,
      allowSameDayBookings: p.allowSameDayBookings, slotIntervalMinutes: p.slotIntervalMinutes,
      minimumNoticeHours: p.minimumNoticeHours, maxBookingAheadDays: p.maxBookingAheadDays,
      fallbackSms: false, mobilePush: p.mobilePush, medicalDataMode: '',
      timezone: p.timezone, locale: p.locale, currencyCode: p.currencyCode, countryCode: p.countryCode
    },
    procedures: data.procedures.map(p => ({id:p.id,name:p.name,durationMinutes:p.durationMinutes,priceGuide:p.priceGuide})),
    blockedDates: data.blockedDates.map(b => ({date:b.date, reason:'Practice closed'})),
    blockedTimes: data.blockedTimes.map((b,i) => ({id:`closed-${i}`,date:b.date,startTime:b.startTime,endTime:b.endTime,reason:'Unavailable'})),
    practitioners: data.practitioners.filter(p => p.active).map(p => ({id:p.id,name:p.name,role:p.role,active:true,displayOrder:p.displayOrder})),
    practitionerWorkingHours: data.practitionerWorkingHours.filter(h => data.practitioners.some(p=>p.id===h.practitionerId && p.active)).map(h => ({practitionerId:h.practitionerId,dayOfWeek:h.dayOfWeek,startTime:h.startTime,endTime:h.endTime,active:h.active,lunchBreakEnabled:h.lunchBreakEnabled,lunchBreakStart:h.lunchBreakStart,lunchBreakEnd:h.lunchBreakEnd})),
    practitionerProcedures: data.practitionerProcedures.filter(r => data.practitioners.some(p=>p.id===r.practitionerId && p.active) && data.procedures.some(p=>p.id===r.procedureId)).map(r => ({practitionerId:r.practitionerId,procedureId:r.procedureId})),
    practitionerBlockedTimes: data.practitionerBlockedTimes.filter(b => data.practitioners.some(p=>p.id===b.practitionerId && p.active)).map((b,i) => ({id:`unavailable-${i}`,practitionerId:b.practitionerId,date:b.date,startTime:b.startTime,endTime:b.endTime,reason:'Unavailable'}))
  };
}
