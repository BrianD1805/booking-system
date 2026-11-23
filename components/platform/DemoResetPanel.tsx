'use client';
import {useCallback,useEffect,useState} from 'react';

type Settings={workingDays:number[];workingStartTime:string;workingEndTime:string;slotIntervalMinutes:number;minimumNoticeHours:number;maxBookingAheadDays:number;lunchBreakEnabled:boolean;lunchBreakStart:string;lunchBreakEnd:string;allowSameDayBookings:boolean;cancellationPolicyNote:string;clientPhoneCountryCode:string};
type Target={id:string;name:string;tenant_slug:string|null};
type Profile={business:{id:string;name:string};defaults:Settings;saved:boolean;savedAt:string|null};
type ApiResult={targets?:Target[];profile?:Profile|null;message?:string;error?:string};

export function DemoResetPanel({platformKey,onExit}:{platformKey:string;onExit:()=>void}) {
  const [targets,setTargets]=useState<Target[]>([]),[id,setId]=useState('');
  const [profile,setProfile]=useState<Profile|null>(null),[draft,setDraft]=useState<Settings|null>(null);
  const [confirmOpen,setConfirmOpen]=useState(false),[confirmText,setConfirmText]=useState(''),[acknowledged,setAcknowledged]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const api=useCallback(async (target:string,body?:unknown):Promise<ApiResult>=>{
    const response=await fetch(`/api/platform/demo-reset${target?`?id=${encodeURIComponent(target)}`:''}`,{
      method:body?'POST':'GET',cache:'no-store',headers:{'x-zipbook-platform-key':platformKey,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})
    });
    const json=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(typeof json.error==='string'?json.error:'Could not load demo settings.');
    return json;
  },[platformKey]);
  const load=useCallback(async(target:string,clearNotice=true)=>{
    setBusy(true);setError('');if(clearNotice)setNotice('');
    try {const data=await api(target);setTargets(data.targets??[]);setProfile(data.profile??null);setDraft(data.profile?.defaults??null);}
    catch(e){setError(e instanceof Error?e.message:'Could not load demo settings.');}
    finally{setBusy(false);}
  },[api]);
  useEffect(()=>{void load('');},[load]);
  function change<K extends keyof Settings>(key:K,value:Settings[K]){setDraft(previous=>previous?{...previous,[key]:value}:previous);}
  async function save(){
    if(!draft||!id)return;setBusy(true);setError('');setNotice('');
    try {const result=await api('',{action:'save',id,settings:draft});setNotice(result.message||'Demo settings saved.');setProfile(p=>p?{...p,saved:true,savedAt:new Date().toISOString(),defaults:draft}:p);}
    catch(e){setError(e instanceof Error?e.message:'Could not save defaults.');}
    finally{setBusy(false);}
  }
  async function reset(){
    if(!id||confirmText!=='DELETE'||!acknowledged)return;
    setBusy(true);setError('');setNotice('');
    try {const result=await api('',{action:'reset',id,confirmation:confirmText,acknowledged});setNotice(result.message||'Demo reset complete.');setConfirmOpen(false);setConfirmText('');setAcknowledged(false);const data=await api(id);setProfile(data.profile??null);setDraft(data.profile?.defaults??null);}
    catch(e){setError(e instanceof Error?e.message:'Could not reset demo.');}
    finally{setBusy(false);}
  }
  const field=(key:keyof Settings,title:string,min?:number,max?:number)=>{
    if(!draft)return null;const value=draft[key];
    return <label className="settings-054-field" key={key}><span>{title}</span><input type={typeof value==='number'?'number':'text'} min={min} max={max} value={String(value)} onChange={e=>change(key,(typeof value==='number'?Number(e.target.value):e.target.value) as never)} /></label>;
  };
  return <section className="card platform-demo-page" aria-label="Demo reset defaults">
    <header className="platform-demo-page-head"><div><p className="badge blue-badge">Platform operator only</p><h2>Demo reset defaults</h2><p>Save a reusable baseline, then reset <strong>only an approved demo tenant</strong> to remove test bookings and customers.</p></div><button className="pill" onClick={onExit} disabled={busy}>Back to businesses</button></header>
    <p className="platform-note">Security: only businesses opted in via the private <code>ZIPBOOK_DEMO_RESET_ALLOWED_IDS</code> environment setting appear here. Staff accounts, owners, services and master keys are always retained.</p>
    <label className="settings-054-field" htmlFor="demo-target"><span>Choose demo tenant</span><select id="demo-target" value={id} disabled={busy} onChange={event=>{const next=event.target.value;setId(next);setProfile(null);setDraft(null);if(next)void load(next);}}><option value="">Select approved demo business</option>{targets.map(t=><option key={t.id} value={t.id}>{t.name} ({t.id})</option>)}</select></label>
    {!targets.length&&!busy&&<p className="platform-error">No approved demos. Add <code>ZIPBOOK_DEMO_RESET_ALLOWED_IDS=practice_001</code> to Netlify environment variables, then redeploy.</p>}
    {error&&<p className="platform-error" role="alert">{error}</p>}{notice&&<p className="platform-note" role="status">{notice}</p>}
    {profile&&draft&&<>
      <div className="platform-demo-status"><strong>{profile.business.name}</strong><span>{profile.saved?`Defaults saved ${profile.savedAt?new Date(profile.savedAt).toLocaleString('en-GB'):''}`:'No saved defaults — showing the current practice settings'}</span></div>
      <div className="settings-054-form-grid platform-demo-grid">
        {field('workingStartTime','Opening time (HH:MM)')}{field('workingEndTime','Closing time (HH:MM)')}
        {field('slotIntervalMinutes','Diary interval (minutes)',5,120)}{field('minimumNoticeHours','Minimum notice (hours)',0,168)}
        {field('maxBookingAheadDays','Maximum booking ahead (days)',1,365)}{field('clientPhoneCountryCode','Default phone country code (GB, KE…)')}
        {field('lunchBreakStart','Lunch start (HH:MM)')}{field('lunchBreakEnd','Lunch finish (HH:MM)')}
        <div className="settings-054-field platform-demo-wide"><span>Working days</span><div className="platform-demo-weekdays">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((label,day)=><label key={day}><input type="checkbox" checked={draft.workingDays.includes(day)} onChange={e=>change('workingDays',e.target.checked?[...draft.workingDays,day]:draft.workingDays.filter(d=>d!==day))}/>{label}</label>)}</div></div>
        <label className="settings-054-checkbox"><input type="checkbox" checked={draft.lunchBreakEnabled} onChange={e=>change('lunchBreakEnabled',e.target.checked)}/><span><strong>Lunch break enabled</strong></span></label>
        <label className="settings-054-checkbox"><input type="checkbox" checked={draft.allowSameDayBookings} onChange={e=>change('allowSameDayBookings',e.target.checked)}/><span><strong>Allow same-day bookings</strong></span></label>
        <label className="settings-054-field platform-demo-wide"><span>Cancellation policy guidance</span><textarea maxLength={1000} value={draft.cancellationPolicyNote} onChange={e=>change('cancellationPolicyNote',e.target.value)}/></label>
      </div>
      <div className="platform-demo-actions"><button className="button primary" onClick={()=>void save()} disabled={busy}>{busy?'Saving…':'Save demo defaults'}</button><button className="button danger" disabled={busy||!profile.saved} onClick={()=>{setConfirmOpen(true);setConfirmText('');setAcknowledged(false);setError('');}}>Reset this demo tenant</button></div>
      <p className="mini-copy">Saving defaults does not change the live practice. Reset permanently removes this tenant's appointments, customer accounts, customer documents, notifications, login codes and demo blocked times, and restores the saved booking settings. It does not remove services, practitioner configurations, staff or secrets.</p>
    </>}
    {confirmOpen&&profile&&<div className="settings-054-overlay platform-demo-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setConfirmOpen(false);}}><div className="settings-054-modal platform-demo-confirm" role="alertdialog" aria-modal="true" aria-labelledby="demo-reset-title"><header className="settings-054-modal-head"><div><p className="badge">Destructive action</p><h2 id="demo-reset-title">Delete {profile.business.name} test data?</h2></div><button className="settings-054-close" type="button" aria-label="Close" disabled={busy} onClick={()=>setConfirmOpen(false)}>×</button></header><div className="settings-054-modal-scroll"><p><strong>This permanently deletes all booking and customer records in the selected tenant.</strong> Other tenants remain untouched.</p><p>Staff logins, ownership, master keys and services are preserved. Saved booking settings are restored.</p><label className="settings-054-checkbox"><input type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)} /><span><strong>I confirm this tenant contains test data only.</strong></span></label><label className="settings-054-field"><span>Type DELETE to confirm</span><input value={confirmText} onChange={e=>setConfirmText(e.target.value)} autoComplete="off" spellCheck={false} placeholder="DELETE" /></label></div><footer className="settings-054-modal-footer"><button className="pill" disabled={busy} onClick={()=>setConfirmOpen(false)}>Cancel</button><button className="button danger" disabled={busy||!acknowledged||confirmText!=='DELETE'} onClick={()=>void reset()}>{busy?'Resetting…':'Permanently delete test data'}</button></footer></div></div>}
  </section>;
}
