'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import {APP_VERSION} from '@/lib/mockData';

type TurnstileApi={render:(element:HTMLElement,opts:{sitekey:string;action:string;callback:(token:string)=>void;'expired-callback':()=>void;'error-callback':()=>void})=>string;reset:(id:string)=>void;remove:(id:string)=>void};
type DemoWindow=Window & {turnstile?:TurnstileApi};
type DemoStage='start'|'contact'|'verify';
export default function DemoLanding(){
  const [enabled,setEnabled]=useState(false);
  const [siteKey,setSiteKey]=useState('');
  const [active,setActive]=useState(false);
  const [checking,setChecking]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [stage,setStage]=useState<DemoStage>('start');
  const [challenge,setChallenge]=useState('');
  const [expiresAt,setExpiresAt]=useState('');
  const [firstName,setFirstName]=useState('');
  const [surname,setSurname]=useState('');
  const [phone,setPhone]=useState('');
  const [email,setEmail]=useState('');
  const [code,setCode]=useState('');
  const [consent,setConsent]=useState(false);
  const widget=useRef<HTMLDivElement>(null);
  const widgetId=useRef('');
  const isLocal=typeof window!=='undefined' && ['localhost','127.0.0.1'].includes(window.location.hostname);
  const diaryHref=isLocal?'/admin?demo=1':'https://admin.zipbook.app/admin?demo=1';
  const sync=useCallback(async()=>{
    const [config,session]=await Promise.all([
      fetch('/api/demo/config',{cache:'no-store'}).then(r=>r.json()),
      fetch('/api/demo/session',{cache:'no-store'}).then(async r=>r.ok?r.json():null)
    ]);
    setEnabled(Boolean(config.enabled));setSiteKey(config.siteKey||'');
    setActive(Boolean(session?.active && session?.realDemo));
    setExpiresAt(session?.expiresAt||'');
  },[]);
  useEffect(()=>{let cancelled=false;sync().catch(()=>{if(!cancelled)setError('The demo could not be reached.');}).finally(()=>{if(!cancelled)setChecking(false);});return()=>{cancelled=true;};},[sync]);
  useEffect(()=>{
    if(!active||!expiresAt)return;
    const id=window.setInterval(()=>{if(Date.now()>=new Date(expiresAt).getTime()){void sync();setStage('start');}},15000);
    return()=>window.clearInterval(id);
  },[active,expiresAt,sync]);
  useEffect(()=>{
    if(!enabled || active || stage!=='start' || !siteKey || !widget.current)return;
    const win=window as DemoWindow;
    let script=document.getElementById('zipbook-real-demo-turnstile') as HTMLScriptElement|null;
    const render=()=>{
      if(!widget.current || !win.turnstile || widgetId.current)return;
      widgetId.current=win.turnstile.render(widget.current,{sitekey:siteKey,action:'zipbook_demo',callback:setChallenge,'expired-callback':()=>setChallenge(''),'error-callback':()=>setChallenge('')});
    };
    if(win.turnstile)render();
    else {if(!script){script=document.createElement('script');script.id='zipbook-real-demo-turnstile';script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;document.head.appendChild(script);}script.addEventListener('load',render);}
    return()=>{script?.removeEventListener('load',render);if(widgetId.current&&win.turnstile){try{win.turnstile.remove(widgetId.current);}catch{/* expired */}}widgetId.current='';};
  },[enabled,active,siteKey,stage]);
  async function postJson(url:string,body:unknown){
    const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    return {response,data};
  }
  async function startDemo(){
    if(!challenge||busy)return;
    setBusy(true);setError('');setMessage('');
    try {
      const {response,data}=await postJson('/api/demo/start',{challenge});
      if(response.status===409&&data.requiresVerification){setStage('contact');setChallenge('');setMessage('This network has used its first demo. Enter your details for another 30 minutes.');return;}
      if(!response.ok)throw new Error(data.error||'Could not start the demo.');
      // The customer app deliberately starts signed out: visitors can test
      // real account registration, OTP email verification and password login.
      window.localStorage.removeItem('zipbook-client-session');
      await sync();
    }catch(e){setError(e instanceof Error?e.message:'Could not start the demo.');setChallenge('');if(widgetId.current)(window as DemoWindow).turnstile?.reset(widgetId.current);}finally{setBusy(false);}
  }
  async function requestCode(){
    if(busy||!consent)return;
    setBusy(true);setError('');
    try{
      const {response,data}=await postJson('/api/demo/request-code',{firstName,surname,phone,email,consent});
      if(!response.ok)throw new Error(data.error||'Could not send the verification email.');
      setMessage(`A six-digit verification code was sent to ${data.destination||'your email'}. It expires in 10 minutes.`);
      setStage('verify');
    }catch(e){setError(e instanceof Error?e.message:'Could not send the code.');}finally{setBusy(false);}
  }
  async function verifyCode(){
    if(busy||!/^\d{6}$/.test(code))return;
    setBusy(true);setError('');
    try{
      const {response,data}=await postJson('/api/demo/verify-code',{code});
      if(!response.ok)throw new Error(data.error||'Verification failed.');
      window.localStorage.removeItem('zipbook-client-session');
      await sync();setStage('start');setCode('');setMessage('');
    }catch(e){setError(e instanceof Error?e.message:'Verification failed.');}finally{setBusy(false);}
  }
  async function endDemo(){
    await postJson('/api/demo/logout',{}).catch(()=>undefined);
    window.localStorage.removeItem('zipbook-client-session');
    setActive(false);setExpiresAt('');setStage('start');setChallenge('');setCode('');setError('');setMessage('Your demo has ended. Additional sessions require email verification.');
  }
  return <main className="zip-demo-page">
    <header className="zip-demo-top"><a href="/" className="zip-demo-brand">ZipBook</a><span>{APP_VERSION}</span></header>
    <div className="zip-demo-container">
      <div className="zip-demo-intro"><p className="badge blue-badge">Full connected demonstration</p><h1>Try the real ZipBook</h1><p>One test practice, two connected applications. Register as a customer and make an appointment, then open the genuine Practice Diary to see and change it.</p></div>
      {checking ? <section className="zip-demo-panel"><p>Checking demo access…</p></section> : !enabled ?
        <section className="zip-demo-panel"><h2>Full demo not enabled yet</h2><p>The platform owner must first confirm this business contains test data only, then enable restricted demo access in Netlify.</p></section> : !active ?
        <section className="zip-demo-panel zip-demo-gate">
          {stage==='start' ? <><h2>Start your 30-minute demo</h2><p>Complete the security check. Your first demo is free to explore without creating an account. We use a one-way hash of your network address to limit abuse. A repeat demo from the same network requires contact details and an email verification code; shared networks may therefore count as a repeat visit.</p><div className="zip-demo-challenge" ref={widget} aria-label="Human verification"/><button type="button" className="button primary" disabled={!challenge||busy} onClick={()=>void startDemo()}>{busy?'Verifying…':'Start the full demo'}</button></> :
          stage==='contact' ? <><h2>Request another 30 minutes</h2><p>Enter your contact details. We'll send a verification code to your email before granting further access.</p><div className="zip-demo-contact-grid">
            <label>First name<input required autoComplete="given-name" value={firstName} onChange={e=>setFirstName(e.target.value)} maxLength={80}/></label>
            <label>Surname<input required autoComplete="family-name" value={surname} onChange={e=>setSurname(e.target.value)} maxLength={80}/></label>
            <label>Mobile number with country code<input required type="tel" autoComplete="tel" placeholder="+447123456789" value={phone} onChange={e=>setPhone(e.target.value)} maxLength={24}/></label>
            <label>Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254}/></label>
          </div><label className="zip-demo-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> I understand my details are used to verify repeat demo access. Demo customer records are test data and may be cleared during resets; please don't enter confidential information.</label><button type="button" className="button primary" disabled={busy||!consent||!firstName.trim()||!surname.trim()||!phone.trim()||!email.trim()} onClick={()=>void requestCode()}>{busy?'Sending…':'Email me a verification code'}</button></> :
          <><h2>Verify your email</h2><p>{message}</p><label className="zip-demo-otp-label">Six-digit code<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))}/></label><button className="button primary" type="button" disabled={busy||code.length!==6} onClick={()=>void verifyCode()}>{busy?'Verifying…':'Verify and start 30-minute demo'}</button><button type="button" className="pill" onClick={()=>{setCode('');setStage('contact');setError('');}}>Change details / resend code</button></>}
          {stage!=='start'&&<button type="button" className="pill" onClick={()=>{setStage('start');setError('');setMessage('');setChallenge('');setCode('');}}>Restart security check</button>}
          {error&&<p role="alert" className="zip-demo-message">{error}</p>}
          {stage==='start'&&message&&<p role="status" className="zip-demo-message">{message}</p>}
        </section> : <section className="zip-demo-panel"><h2>Your connected 30-minute demo is ready</h2><p>Access until {expiresAt?new Date(expiresAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'session expiry'}. Both applications use the same genuine booking system and demo tenant.</p><div className="zip-demo-app-grid">
          <div className="zip-demo-app-card"><div className="zip-demo-app-icon" aria-hidden="true"><img src="/icons/icon-72.png" alt="" width="48" height="48" style={{borderRadius:12}} /></div><h3>1. Customer booking application</h3><p>Explore the real customer Home page first. Make a guest booking, or choose Login / Sign up to test a customer account, email verification and appointment management.</p><a className="button primary" href="/book" target="_blank" rel="noopener noreferrer">Open Customer App</a></div>
          <div className="zip-demo-app-card"><div className="zip-demo-app-icon" aria-hidden="true">📅</div><h3>2. Actual Practice Diary</h3><p>Open the working diary and reception tools. View and manage the same appointments without access to protected owner settings.</p><a className="button primary" href={diaryHref} target="_blank" rel="noopener noreferrer">Open Practice Diary</a></div>
        </div><p className="zip-demo-disclaimer">All bookings are test bookings and may be reset. Use fictional appointment notes only. Registration and repeat-demo verification emails are sent, but appointment notification emails and push alerts are disabled in the demo.</p><button type="button" className="pill" onClick={()=>void endDemo()}>End demo session</button></section>}
    </div>
  </main>;
}
