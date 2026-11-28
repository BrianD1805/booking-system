'use client';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { APP_VERSION } from '@/lib/domains';
import { DemoResetPanel } from '@/components/platform/DemoResetPanel';

type Business={id:string;name:string;tenant_slug:string;owner_name:string;owner_email:string;timezone:string;currency_code:string;country_code:string;pilot_enabled:boolean;onboarding_completed:boolean;platform_suspended:boolean|null;emails?:Record<string,{status:string;createdAt:string;checkedAt:string|null}>;verified_at:string|null;expires_at:string|null;active_practitioners:number;active_services:number;configured_practitioners:number};
type Overview={businesses:Business[];accountsEnabled:boolean;emailConfigured:boolean};
type Draft={name:string;slug:string;ownerName:string;ownerEmail:string;timezone:string;currency:string;country:string};
type ReadinessCheck={key:string;label:string;status:'pass'|'action'|'manual';detail:string};
type ReadinessReport={business:{id:string;name:string;slug:string};checks:ReadinessCheck[];requiredActions:number;optionalChecks:number;readyForManualReview:boolean;isolation:{status:string;checkedTables:number;referenceType:string;verifiedInDatabase:boolean};note:string};
type Action='activate'|'publish'|'suspend'|'resend'|'delete-data';
const empty:Draft={name:'',slug:'',ownerName:'',ownerEmail:'',timezone:'Europe/London',currency:'GBP',country:'GB'};
const initial:Overview={businesses:[],accountsEnabled:false,emailConfigured:false};
const status=(b:Business)=>b.onboarding_completed?'Bookings open':b.pilot_enabled?'Diary setup':b.platform_suspended?'Suspended':b.verified_at?'Awaiting activation':'Invitation pending';
function EmailStatus({business,kind,label}:{business:Business;kind:'invitation'|'diary'|'live';label:string}) {
  const email=business.emails?.[kind];
  return <p>{label}: {email?.status?.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase())||'No recorded delivery'}{email?.createdAt&&` · ${new Date(email.createdAt).toLocaleString('en-GB')}`}</p>;
}
function Modal({title,children,footer,onClose,busy}:{title:string;children:ReactNode;footer:ReactNode;onClose:()=>void;busy:boolean}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current;const overflow=document.body.style.overflow;dialog?.showModal();document.body.style.overflow='hidden';return()=>{dialog?.close();document.body.style.overflow=overflow;};},[]);
  return <dialog ref={ref} className="settings-054-modal platform-dialog" aria-label={title} onCancel={event=>{event.preventDefault();if(!busy)onClose();}}><div className="settings-054-modal-head"><h2>{title}</h2><button type="button" className="settings-054-close" aria-label="Close" disabled={busy} onClick={onClose}>×</button></div><div className="settings-054-modal-scroll">{children}</div><div className="settings-054-modal-footer">{footer}</div></dialog>;
}
export default function PlatformPage(){
  const [demoPage,setDemoPage]=useState(false);
  const [key,setKey]=useState(''),[signedIn,setSignedIn]=useState(false),[overview,setOverview]=useState<Overview>(initial),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[search,setSearch]=useState(''),[draft,setDraft]=useState<Draft>(empty),[create,setCreate]=useState(false),[pending,setPending]=useState<{business:Business;action:Action}|null>(null),[readinessBusiness,setReadinessBusiness]=useState<Business|null>(null),[readiness,setReadiness]=useState<ReadinessReport|null>(null);
  const [expiresAt,setExpiresAt]=useState(0),[confirmation,setConfirmation]=useState('');
  function clearSession(){setKey('');setSignedIn(false);setOverview(initial);setExpiresAt(0);setCreate(false);setPending(null);setReadinessBusiness(null);setReadiness(null);setDemoPage(false);}
  useEffect(()=>{let cancelled=false; void (async()=>{try{const r=await fetch('/api/platform/session',{cache:'no-store'});if(!r.ok)return;const session=await r.json();const businesses=await fetch('/api/platform/businesses',{cache:'no-store'});if(!businesses.ok)return;const data=await businesses.json();if(!cancelled){setExpiresAt(session.expiresAt);setOverview(data);setSignedIn(true);}}catch{/* require sign-in */}})();return()=>{cancelled=true;};},[]);
  useEffect(()=>{if(!expiresAt)return;const timer=window.setTimeout(()=>{clearSession();setError('Your five-hour session has expired. Please sign in again.');},Math.max(0,expiresAt-Date.now()));return()=>window.clearTimeout(timer);},[expiresAt]);
  async function signOut(){setBusy(true);try{const response=await fetch('/api/platform/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});if(!response.ok)throw new Error('Unable to sign out. Try again.');clearSession();setNotice('');setError('');}catch(e){setError(e instanceof Error?e.message:'Unable to sign out.');}finally{setBusy(false);}}
  async function fetchData(body?:unknown){
    const response=await fetch('/api/platform/businesses',{method:body?'POST':'GET',cache:'no-store',headers:{...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) {if(response.status===401){clearSession();}throw new Error(data.error||'Unable to reach ZipBook.');}return data;
  }
  async function load(event?:FormEvent){event?.preventDefault();setBusy(true);setError('');try{if(!signedIn){const response=await fetch('/api/platform/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',key})});const session=await response.json();if(!response.ok)throw new Error(session.error||'Unable to sign in.');setExpiresAt(session.expiresAt);setKey('');}setOverview(await fetchData());setSignedIn(true);}catch(e){setError(e instanceof Error?e.message:'Unable to sign in.');}finally{setBusy(false);}}
  async function save(body:unknown){setBusy(true);setError('');setNotice('');try{const result=await fetchData(body);setCreate(false);setPending(null);setNotice(result.message);setOverview(await fetchData());}catch(e){setError(e instanceof Error?e.message:'Unable to save.');}finally{setBusy(false);}}
  async function inspectReadiness(b:Business){
    setReadinessBusiness(b);setReadiness(null);setBusy(true);setError('');
    try{
      const response=await fetch(`/api/platform/readiness?id=${encodeURIComponent(b.id)}`,{cache:'no-store',headers:{}});
      const data=await response.json().catch(()=>({}));
      if(!response.ok){if(response.status===401){clearSession();}throw new Error(data.error||'Could not check this business.');}
      setReadiness(data as ReadinessReport);
    }catch(e){setError(e instanceof Error?e.message:'Readiness check failed.');}
    finally{setBusy(false);}
  }
  function close(){if(!busy){setCreate(false);setPending(null);setReadinessBusiness(null);setReadiness(null);setError('');}}
  const rows=overview.businesses.filter(b=>[b.name,b.tenant_slug,b.owner_email].some(v=>v.toLowerCase().includes(search.toLowerCase())));
  return <main className="shell fresh-shell platform-shell"><header className="topbar"><div className="brand"><img className="brand-icon" src="/icons/icon-72.png" alt="" width="44" height="44"/><span>ZipBook<br/><small>Platform administration · {APP_VERSION}</small></span></div>{signedIn&&<button className="button" disabled={busy} onClick={()=>void signOut()}>Sign out</button>}</header>
    {!signedIn?<section className="card platform-signin"><h1>Platform administration</h1><p>Sign in to manage ZipBook business accounts.</p><form className="settings-054-modal-stack" onSubmit={load}><label className="settings-054-field">Platform access key<input type="password" value={key} onChange={e=>setKey(e.target.value)} required autoComplete="off" spellCheck={false}/></label><button className="button primary" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form>{error&&<p role="alert" className="platform-error">{error}</p>}</section>:<>
      {demoPage ? <DemoResetPanel platformKey="" onExit={()=>setDemoPage(false)} /> : <>
      <section className="card platform-heading"><div><p className="badge blue-badge">ZipBook platform</p><h1>Business accounts</h1><p>Register businesses, invite their owners and manage access.</p></div><div className="nav-pills"><button className="button" onClick={()=>{setDemoPage(true);setError('');}} disabled={busy}>Demo reset defaults</button><button className="button" onClick={()=>void load()} disabled={busy}>Refresh</button><button className="button primary" disabled={busy||!overview.emailConfigured} onClick={()=>{setDraft(empty);setError('');setCreate(true);}}>Add business</button></div></section>
      <section className="platform-metrics">{[['Registered',overview.businesses.length],['Awaiting verification',overview.businesses.filter(b=>!b.verified_at).length],['Diary access',overview.businesses.filter(b=>b.pilot_enabled).length],['Bookings open',overview.businesses.filter(b=>b.onboarding_completed).length]].map(([label,n])=><div className="card" key={label}><small>{label}</small><strong>{n}</strong></div>)}</section>
      {!overview.emailConfigured&&<p className="platform-error" role="alert">Email delivery is not configured. Business registration requires Resend.</p>}{!overview.accountsEnabled&&<p className="platform-note">Business diary access is disabled in platform configuration. Invitations can still be prepared.</p>}
      {notice&&<p className="platform-note" role="status">{notice}</p>}{error&&!create&&!pending&&<p className="platform-error" role="alert">{error}</p>}
      <section className="card"><label className="settings-054-field">Search businesses<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Business name, address or owner email"/></label><div className="platform-list">{rows.length===0?<p className="settings-054-empty">{search?'No matching businesses.':'No businesses registered yet.'}</p>:rows.map(b=><article key={b.id} className="platform-business"><div className="platform-business-main"><div><h2>{b.name}</h2><p>{b.tenant_slug}.zipbook.app</p><p>{b.owner_name} · {b.owner_email}</p><small>{b.country_code} · {b.currency_code} · {b.timezone}</small></div><span className="pill">{status(b)}</span></div><details className="platform-note platform-onboarding">
        <summary>Business links and onboarding progress</summary>
        <div className="platform-onboarding-stages">
          <section className="platform-onboarding-stage">
            <h3>1. Invitation and owner verification</h3>
            <p>Owner login: {b.owner_email}</p>
            <EmailStatus business={b} kind="invitation" label="Invitation email"/>
            <p>Owner verification: {b.verified_at?`Verified ${new Date(b.verified_at).toLocaleString('en-GB')}`:new Date(b.expires_at||0).getTime()<Date.now()?'Invitation expired':'Invitation pending'}</p>
          </section>
          <section className="platform-onboarding-stage">
            <h3>2. Practice Diary activation</h3>
            <p>Diary access: {b.pilot_enabled?'Enabled':b.platform_suspended?'Suspended':b.verified_at?'Awaiting activation':'Not enabled'}</p>
            <p>Diary: <a className="platform-business-url" href={`https://${b.tenant_slug}.zipbook.app/admin`} target="_blank" rel="noopener noreferrer">https://{b.tenant_slug}.zipbook.app/admin</a></p>
            <EmailStatus business={b} kind="diary" label="Diary welcome email"/>
            {b.pilot_enabled&&<button className="button" disabled={busy||!overview.emailConfigured} onClick={()=>void save({action:'resend-diary',id:b.id})}>Resend diary welcome email</button>}
          </section>
          <section className="platform-onboarding-stage">
            <h3>3. Business setup and readiness</h3>
            <p>{b.active_practitioners} active {b.active_practitioners===1?'practitioner':'practitioners'} · {b.active_services} active {b.active_services===1?'service':'services'}</p>
            <p>{b.configured_practitioners} {b.configured_practitioners===1?'practitioner':'practitioners'} with assigned services and hours</p>
            <p>Setup: {b.configured_practitioners?'Practitioner schedule configured; manual checks required':'Configuration required'}</p>
          </section>
          <section className="platform-onboarding-stage">
            <h3>4. Public booking activation</h3>
            <p>Public bookings: {b.onboarding_completed?'Open':'Closed'}</p>
            <p>Booking: <a className="platform-business-url" href={`https://${b.tenant_slug}.zipbook.app/book`} target="_blank" rel="noopener noreferrer">https://{b.tenant_slug}.zipbook.app/book</a></p>
            <EmailStatus business={b} kind="live" label="Business live email"/>
            {b.onboarding_completed&&<button className="button" disabled={busy||!overview.emailConfigured} onClick={()=>void save({action:'resend-live',id:b.id})}>Resend business live email</button>}
          </section>
          <div className="platform-onboarding-email-help">
            <p><small>Accepted means Resend accepted the request, not confirmed delivery. Older emails may have no tracking record.</small></p>
            <button className="button" disabled={busy} onClick={()=>void save({action:'refresh-email',id:b.id})}>Refresh email delivery status</button>
          </div>
        </div>
      </details><div className="nav-pills">
        <button className="button" disabled={busy} onClick={()=>void inspectReadiness(b)}>Readiness check</button>
        {!b.verified_at&&<button className="button" disabled={busy||!overview.emailConfigured} onClick={()=>setPending({business:b,action:'resend'})}>Resend invitation</button>}
        {b.verified_at&&!b.pilot_enabled&&<button className="button primary" disabled={busy||!overview.accountsEnabled} onClick={()=>setPending({business:b,action:'activate'})}>Enable diary</button>}
        {b.pilot_enabled&&<><a className="button" href={`https://${b.tenant_slug}.zipbook.app/admin`} target="_blank" rel="noreferrer">Open diary</a>{!b.onboarding_completed?<button className="button primary" disabled={busy||!b.configured_practitioners||!overview.accountsEnabled} onClick={()=>setPending({business:b,action:'publish'})}>Open public bookings</button>:<a className="button" href={`https://${b.tenant_slug}.zipbook.app/book`} target="_blank" rel="noreferrer">Booking page</a>}<button className="button" disabled={busy} onClick={()=>setPending({business:b,action:'suspend'})}>Suspend access</button></>}<button className="button" disabled={busy} onClick={()=>{setConfirmation('');setError('');setPending({business:b,action:'delete-data'});}}>Delete data</button>
      </div></article>)}</div></section>
      </>}
    </>}
    {signedIn&&create&&<Modal title="Register a business" busy={busy} onClose={close} footer={<><button className="button" disabled={busy} onClick={close}>Cancel</button><button type="submit" form="platform-business-form" className="button primary" disabled={busy}>{busy?'Saving…':'Create and invite'}</button></>}><form id="platform-business-form" className="settings-054-modal-stack" onSubmit={e=>{e.preventDefault();void save({action:'create',business:draft});}}><p className="settings-054-help">The owner will receive a private email link to verify their address and set a password. The diary and public bookings remain disabled until you enable them.</p><div className="settings-054-form-grid">{([['name','Business name'],['slug','Business address prefix'],['ownerName','Owner name'],['ownerEmail','Owner email'],['country','Country code'],['currency','Currency code'],['timezone','Timezone']] as [keyof Draft,string][]).map(([field,label])=><label key={field} className={'settings-054-field '+(field==='timezone'?'span-two':'')}>{label}<input required value={draft[field]} type={field==='ownerEmail'?'email':'text'} maxLength={field==='ownerEmail'?254:field==='slug'?48:field==='currency'?3:field==='country'?2:120} onChange={e=>setDraft(old=>({...old,[field]:field==='slug'?e.target.value.toLowerCase():field==='country'||field==='currency'?e.target.value.toUpperCase():e.target.value}))}/>{field==='slug'&&<small>{draft.slug||'business'}.zipbook.app</small>}{field==='timezone'&&<small>For example Africa/Johannesburg or Europe/London</small>}</label>)}</div>{error&&<p role="alert" className="platform-error">{error}</p>}</form></Modal>}
    {signedIn&&readinessBusiness&&<Modal title={`Readiness check — ${readinessBusiness.name}`} busy={busy} onClose={close} footer={<button className="button primary" disabled={busy} onClick={close}>Close</button>}>
      {readiness?<div className="settings-054-modal-stack">
        <p className="platform-note" role="status">{readiness.requiredActions===0?'No outstanding technical setup blockers in this check. Complete the manual acceptance tests before publishing.':`${readiness.requiredActions} setup or security check${readiness.requiredActions===1?' needs':'s need'} attention before rollout.`}</p>
        <div className="platform-readiness-list">{readiness.checks.map(check=><div key={check.key} className="platform-readiness-row"><div className="platform-readiness-head"><strong>{check.label}</strong><span className="pill">{check.status==='pass'?'Passed':check.status==='manual'?'Optional / manual':'Action required'}</span></div><p>{check.detail}</p></div>)}</div>
        <p className="settings-054-help">{readiness.note} {readiness.isolation.status==='pass'?(readiness.isolation.referenceType==='pilot'?'Compared against another registered pilot business.':'Compared against a separate existing (legacy) practice.'):''}</p>
      </div>:busy?<p className="platform-note">Checking this business and running the read-only database isolation audit…</p>:error?<p className="platform-error" role="alert">{error}</p>:null}
    </Modal>}
    {signedIn&&pending&&<Modal title={`${pending.action==='activate'?'Enable diary':pending.action==='publish'?'Open public bookings':pending.action==='suspend'?'Suspend access':pending.action==='delete-data'?'Delete data':'Resend invitation'} — ${pending.business.name}`} busy={busy} onClose={close} footer={<><button className="button" disabled={busy} onClick={close}>Cancel</button><button className="button primary" disabled={busy||(pending.action==='delete-data'&&(pending.business.pilot_enabled||confirmation!==`DELETE ${pending.business.tenant_slug}`))} onClick={()=>void save({action:pending.action,id:pending.business.id,confirmed:true,confirmation})}>{busy?'Saving…':'Confirm'}</button></>}><p>{pending.action==='activate'?'Confirm that the business subdomain has been added to Netlify, DNS is correct and HTTPS works. This enables the owner’s diary login, not public bookings.':pending.action==='publish'?'Confirm that the owner’s settings, hours, services, practitioner assignments and booking flow have been checked. This enables public bookings.':pending.action==='suspend'?'This disables access and public bookings, and revokes existing staff sessions. Business data is retained.':pending.action==='delete-data'?'Permanently remove all customer records, client logins and bookings for this business only. Practice settings, blocked dates, practitioner schedules and staff accounts are retained. Back up first.':'This replaces the previous invitation and sends a new 48-hour link to the registered owner email.'}</p>{pending.action==='delete-data'&&<><p role="alert">{pending.business.pilot_enabled?'Suspend access first, then reopen Delete data.':'Type the following confirmation to proceed.'}</p><label className="settings-054-field">DELETE {pending.business.tenant_slug}<input value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off" /></label></>}{error&&<p className="platform-error" role="alert">{error}</p>}</Modal>}
  </main>;
}
