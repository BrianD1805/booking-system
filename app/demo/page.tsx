'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import {APP_VERSION} from '@/lib/mockData';

type TurnstileApi={render:(element:HTMLElement,opts:{sitekey:string;action:string;callback:(token:string)=>void;'expired-callback':()=>void;'error-callback':()=>void})=>string;reset:(id:string)=>void;remove:(id:string)=>void};
type DemoWindow=Window & {turnstile?:TurnstileApi};
export default function DemoLanding(){
  const [enabled,setEnabled]=useState(false);
  const [siteKey,setSiteKey]=useState('');
  const [active,setActive]=useState(false);
  const [checking,setChecking]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [challenge,setChallenge]=useState('');
  const [expiresAt,setExpiresAt]=useState('');
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
    if(!enabled || active || !siteKey || !widget.current)return;
    const win=window as DemoWindow;
    let script=document.getElementById('zipbook-real-demo-turnstile') as HTMLScriptElement|null;
    const render=()=>{
      if(!widget.current || !win.turnstile || widgetId.current)return;
      widgetId.current=win.turnstile.render(widget.current,{sitekey:siteKey,action:'zipbook_demo',callback:setChallenge,'expired-callback':()=>setChallenge(''),'error-callback':()=>setChallenge('')});
    };
    if(win.turnstile)render();
    else {if(!script){script=document.createElement('script');script.id='zipbook-real-demo-turnstile';script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;document.head.appendChild(script);}script.addEventListener('load',render);}
    return()=>{script?.removeEventListener('load',render);if(widgetId.current && win.turnstile){try{win.turnstile.remove(widgetId.current);}catch{/* expired */}}widgetId.current='';};
  },[enabled,active,siteKey]);
  async function startDemo(){
    if(!challenge || busy)return;
    setBusy(true);setError('');
    try {
      const response=await fetch('/api/demo/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challenge})});
      const data=await response.json();
      if(!response.ok || !data.clientSessionToken)throw new Error(data.error||'Could not start the demo.');
      // This is a 15-minute real demo customer session in the original client app.
      window.localStorage.setItem('zipbook-client-session',data.clientSessionToken);
      await sync();
    }catch(e){setError(e instanceof Error?e.message:'Could not start the demo.');setChallenge('');if(widgetId.current)(window as DemoWindow).turnstile?.reset(widgetId.current);}finally{setBusy(false);}
  }
  async function endDemo(){
    await fetch('/api/demo/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).catch(()=>undefined);
    window.localStorage.removeItem('zipbook-client-session');setActive(false);setExpiresAt('');setChallenge('');setError('Your temporary demo has ended.');
  }
  return <main className="zip-demo-page">
    <header className="zip-demo-top"><a href="/" className="zip-demo-brand">ZipBook</a><span>{APP_VERSION}</span></header>
    <div className="zip-demo-container">
      <div className="zip-demo-intro"><p className="badge blue-badge">Full connected demonstration</p><h1>Try the real ZipBook</h1><p>One test practice, two connected applications. Book as a customer, then open the genuine Practice Diary to see and change the appointment.</p></div>
      {checking ? <section className="zip-demo-panel"><p>Checking demo access…</p></section> : !enabled ?
        <section className="zip-demo-panel"><h2>Full demo not enabled yet</h2><p>The platform owner must first confirm this business contains test data only, then enable restricted demo access in Netlify.</p><p>Nothing here will expose the master key or another business.</p></section> : !active ?
        <section className="zip-demo-panel zip-demo-gate"><h2>Open your 15-minute demo</h2><p>Complete the security check to open both real applications. We'll create a temporary fictional customer account for you; no email, password or master key is necessary.</p><div className="zip-demo-challenge" ref={widget} aria-label="Human verification"/><button type="button" className="button primary" disabled={!challenge||busy} onClick={()=>void startDemo()}>{busy?'Verifying…':'Start the full demo'}</button>{error && <p role="alert" className="zip-demo-message">{error}</p>}</section> : <>
        <section className="zip-demo-panel"><h2>Your connected demo is ready</h2><p>Temporary access until {expiresAt?new Date(expiresAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'session expiry'}. Both applications use the same real tenant and database.</p><div className="zip-demo-app-grid">
          <div className="zip-demo-app-card"><div className="zip-demo-app-icon" aria-hidden="true">📱</div><h3>1. Customer booking application</h3><p>Choose a real service and appointment slot, make a booking, and view, edit or delete it from your temporary customer account.</p><a className="button primary" href="/book">Open Customer App</a></div>
          <div className="zip-demo-app-card"><div className="zip-demo-app-icon" aria-hidden="true">📅</div><h3>2. Actual Practice Diary</h3><p>Open the working Admin diary and reception tools. You can see and manage the same appointments, without access to owner-only settings.</p><a className="button primary" href={diaryHref} target="_blank" rel="noopener noreferrer">Open Practice Diary</a></div>
        </div><p className="zip-demo-disclaimer">Demo appointments and customers are shared between visitors. Use made-up details only. Email, push notifications and owner settings are disabled for this demonstration.</p><button type="button" className="pill" onClick={()=>void endDemo()}>End demo session</button></section>
      </>}
    </div>
  </main>;
}
