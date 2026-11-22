// An operator-visible, read-only readiness assessment. It does not activate
// businesses, publish bookings, create appointments or grant permissions.
const result=(key,label,ok,success,action,optional=false)=>({
  key,label,status:ok?'pass':optional?'manual':'action',
  detail:ok?success:action
});

export function assessBusinessReadiness(record,isolation) {
  const r=record||{};
  const count=(name)=>Number(r[name]??0);
  const verified=Boolean(r.verified_at);
  const ownerReady=count('active_owners')>0;
  const diaryEnabled=r.pilot_enabled===true;
  const configured=count('configured_practitioners')>0;
  // Use concrete, tenant-scoped setup counts so the Owner knows which part to fix.
  // Older mock records may not include these counts; in that case use the safe general message.
  const missingSetup=()=>{
    if (r.active_practitioners === undefined) return 'Configure an active practitioner, working hours and an assigned active service in the business Admin.';
    if (count('active_practitioners')===0) return 'No active practitioners. Add or activate a practitioner in the business Admin.';
    if (count('active_services')===0) return 'No active procedures/services. Add or activate one in Admin Settings → Services.';
    if (count('scheduled_practitioners')===0) return 'No active practitioner has working hours. Set and save at least one working day in Working hours & lunch.';
    if (count('assigned_practitioners')===0) return 'No active practitioner has an assigned active procedure. In Edit practitioner, select an active procedure (blue with a tick) and click Save practitioner.';
    return 'No single active practitioner has both working hours and an assigned active procedure. Check the same practitioner’s assignments and weekly schedule.';
  };
  const checks=[
    result('invitation','Owner email verified',verified,'The Owner accepted the invitation.','The Owner must accept their invitation before activation.'),
    result('owner','Owner sign-in configured',ownerReady,'An active Owner login is configured.','Complete the invitation and confirm an active Owner account.'),
    result('diary','Practice Diary enabled',diaryEnabled,'The business diary is enabled.','Enable diary access in Platform Administration after verification.'),
    result('practitioners','Practitioners and services configured',configured,'At least one active practitioner has working hours and an assigned active service.',missingSetup()),
    result('booking','Public bookings',r.onboarding_completed===true,'Public appointment bookings are enabled.','Bookings remain closed until the platform operator intentionally opens them.',true),
    result('publicEmbed','Public booking website integration',count('public_embed_sites')>0,'At least one authorised HTTPS origin allows public booking embedding.','Optional: authorise a business website and enable the public booking iframe.',true),
    result('staffEmbed','Secure staff diary website integration',count('admin_embed_sites')>0,'At least one authorised HTTPS origin allows staff diary embedding.','Optional: authorise a trusted website for staff diary embedding.',true),
    result('logo','Business logo',r.has_logo===true,'A business logo is uploaded.','Optional: upload the business logo in Admin Settings.',true)
  ];
  const isolationPassed=isolation?.status==='pass';
  checks.push({
    key:'isolation',label:'Database tenant isolation',
    status:isolationPassed?'pass':'action',
    detail:isolationPassed?
      `Read-only cross-practice checks passed in both directions; ${isolation.checkedTables} scoped tables have restrictive RLS policies.`:
      isolation?.status==='unavailable'?'No second practice exists yet. Create a separate test business and rerun this check.':
      'Isolation could not be verified. Do not onboard real customer data until the issue is resolved.'
  });
  const pending=checks.filter(x=>x.status==='action').length;
  const manual=checks.filter(x=>x.status==='manual').length;
  return {checks,requiredActions:pending,optionalChecks:manual,readyForManualReview:pending===0};
}
