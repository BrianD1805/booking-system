'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {APP_VERSION} from '@/lib/domains';

type DemoItem={id:string;name:string;service:string;practitioner:string;date:string;time:string};
type TurnstileApi={render:(node:HTMLElement,opts:{sitekey:string;action:string;callback:(token:string)=>void;'expired-callback':()=>void;'error-callback':()=>void})=>string;reset:(id:string)=>void;remove:(id:string)=>void};
type DemoWin=Window & {turnstile?:TurnstileApi};
const todayIso=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
function initialItems(date:string):DemoItem[]{return [
  {id:'example-1',name:'Sample Customer A',service:'Consultation',practitioner:'Demo Practitioner',date,time:'09:30'},
  {id:'example-2',name:'Sample Customer B',service:'Follow-up',practitioner:'Demo Practitioner',date,time:'11:00'},
  {id:'example-3',name:'Sample Customer C',service:'Consultation',practitioner:'Demo Practitioner',date,time:'14:30'}
];}
const slots=['09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','13:30','14:00','14:30','15:00','15:30','16:00'];
export default function DemoPage(){
  const [configured,setConfigured]=useState(false);
  const [siteKey,setSiteKey]=useState('');
  const [active,setActive]=useState(false);
  const [checking,setChecking]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [challenge,setChallenge]=useState('');
  const [expiry,setExpiry]=useState(0);
  const [now,setNow]=useState(Date.now());
  const [date,setDate]=useState(todayIso);
  const [appointments,setAppointments]=useState<DemoItem[]>(()=>initialItems(todayIso()));
  const [name,setName]=useState('Sample Customer');
  const [service,setService]=useState('Consultation');
  const [time,setTime]=useState('09:00');
  const [editId,setEditId]=useState('');
  const widgetContainer=useRef<HTMLDivElement>(null);
  const widgetId=useRef('');
  const addSession=useCallback((expiresAt:string)=>{setExpiry(new Date(expiresAt).getTime());setActive(true);setMessage('');},[]);
  useEffect(()=>{
    let cancelled=false;
    void Promise.all([
      fetch('/api/demo/config',{cache:'no-store'}).then(res=>res.json()),
      fetch('/api/demo/session',{cache:'no-store'}).then(async res=>res.ok?res.json():null)
    ]).then(([config,session])=>{
      if(cancelled)return;
      setConfigured(Boolean(config.enabled));setSiteKey(config.siteKey||'');
      if(session?.active && session.expiresAt)addSession(session.expiresAt);
    }).catch(()=>{if(!cancelled)setMessage('Could not check demo availability.');}).finally(()=>{if(!cancelled)setChecking(false);});
    return ()=>{cancelled=true;};
  },[addSession]);
  useEffect(()=>{const id=window.setInterval(()=>setNow(Date.now()),15000);return()=>window.clearInterval(id);},[]);
  const sessionValid=active && expiry>now;
  useEffect(()=>{
    if(!configured || sessionValid || !siteKey || !widgetContainer.current)return;
    const win=window as DemoWin;
    let script=document.getElementById('zipbook-public-turnstile-script') as HTMLScriptElement|null;
    const render=()=>{
      if(!widgetContainer.current || !win.turnstile || widgetId.current)return;
      widgetId.current=win.turnstile.render(widgetContainer.current,{sitekey:siteKey,action:'zipbook_demo',callback:setChallenge,'expired-callback':()=>setChallenge(''),'error-callback':()=>setChallenge('')});
    };
    if(win.turnstile)render();
    else {
      if(!script){script=document.createElement('script');script.id='zipbook-public-turnstile-script';script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;document.head.appendChild(script);}
      script.addEventListener('load',render);
    }
    return ()=>{script?.removeEventListener('load',render);if(widgetId.current && win.turnstile){try{win.turnstile.remove(widgetId.current);}catch{/* ignore */}}widgetId.current='';};
  },[configured,siteKey,sessionValid]);
  async function start(){
    if(!challenge || busy)return;
    setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/demo/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challenge})});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||'Demo sign-in failed.');
      addSession(new Date(Date.now()+body.expiresInSeconds*1000).toISOString());
      setAppointments(initialItems(date));
    }catch(e){setMessage(e instanceof Error?e.message:'Could not start demo session.');setChallenge('');if(widgetId.current)(window as DemoWin).turnstile?.reset(widgetId.current);}finally{setBusy(false);}
  }
  async function signOut(){
    await fetch('/api/demo/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).catch(()=>undefined);
    setActive(false);setExpiry(0);setChallenge('');setAppointments(initialItems(date));setMessage('Your demo session has ended.');
  }
  function changeDay(day:string){setDate(day);setEditId('');setAppointments(prev=>{return prev.some(a=>a.id==='example-1') && prev.length===3 ? initialItems(day):prev;});}
  function save(){
    if(!sessionValid){setMessage('Your demo session has expired.');return;}
    const clean=name.trim().slice(0,65);
    if(!clean){setMessage('Enter a sample customer name.');return;}
    if(appointments.some(a=>a.date===date && a.time===time && a.id!==editId)){setMessage('That demo time is already occupied. Choose another.');return;}
    const item:DemoItem={id:editId||`demo-${Date.now()}`,name:clean,service,practitioner:'Demo Practitioner',date,time};
    setAppointments(prev=>editId?prev.map(a=>a.id===editId?item:a):[...prev,item]);
    setEditId('');setName('Sample Customer');setMessage(editId?'Demo appointment updated.':'Demo appointment added.');
  }
  function edit(item:DemoItem){setName(item.name);setService(item.service);setDate(item.date);setTime(item.time);setEditId(item.id);setMessage('Editing a fictional appointment.');}
  function remove(id:string){if(!sessionValid)return;setAppointments(prev=>prev.filter(a=>a.id!==id));setMessage('Fictional appointment removed.');if(editId===id)setEditId('');}
  const dayItems=appointments.filter(a=>a.date===date).sort((a,b)=>a.time.localeCompare(b.time));
  return <main className="zip-demo-page">
    <header className="zip-demo-top"><a href="/" className="zip-demo-brand">ZipBook</a><span>{APP_VERSION}</span></header>
    <div className="zip-demo-container">
      <div className="zip-demo-intro"><p className="badge blue-badge">Safe interactive demonstration</p><h1>Explore the practice diary</h1><p>Try appointment scheduling with fictional data. Nothing here changes a real practice diary or sends emails.</p></div>
      {checking ? <section className="zip-demo-panel"><p>Checking demo availability…</p></section> : !configured ? <section className="zip-demo-panel"><h2>Public demo not enabled yet</h2><p>The demo needs its security settings and Cloudflare Turnstile keys configured by the platform owner. It is closed until then.</p><a className="button primary" href="/book">Open the booking page</a></section> : !sessionValid ? <section className="zip-demo-panel zip-demo-gate"><h2>Start a 15-minute demo</h2><p>Complete the security check to open your private, temporary diary playground. No account, password or master key is required.</p><div ref={widgetContainer} className="zip-demo-challenge" aria-label="Bot protection"/><button type="button" className="button primary" disabled={!challenge || busy} onClick={()=>void start()}>{busy?'Checking…':'Open my demo diary'}</button>{message&&<p role="alert" className="zip-demo-message">{message}</p>}</section> : <>
        <section className="zip-demo-panel zip-demo-toolbar"><div><h2>Demo Practice Diary</h2><p>Temporary session · expires at {new Date(expiry).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</p></div><button type="button" className="pill" onClick={()=>void signOut()}>End demo</button></section>
        <section className="zip-demo-panel zip-demo-editor"><div className="zip-demo-editor-head"><h2>{editId?'Edit fictional appointment':'Add fictional appointment'}</h2><button type="button" className="pill" onClick={()=>{setAppointments(initialItems(date));setEditId('');setMessage('Demo data restored for the selected day.');}}>Reset my example</button></div>
          <div className="zip-demo-fields"><label>Diary date<input type="date" value={date} onChange={e=>changeDay(e.target.value)}/></label><label>Customer (fictional)<input maxLength={65} value={name} onChange={e=>setName(e.target.value)}/></label><label>Service<select value={service} onChange={e=>setService(e.target.value)}><option>Consultation</option><option>Follow-up</option><option>Review</option></select></label><label>Time<select value={time} onChange={e=>setTime(e.target.value)}>{slots.map(s=><option key={s}>{s}</option>)}</select></label></div>
          <div className="zip-demo-editor-actions"><button type="button" className="button primary" onClick={save}>{editId?'Save demo changes':'Add demo appointment'}</button>{editId&&<button type="button" className="pill" onClick={()=>setEditId('')}>Cancel editing</button>}</div>
          {message&&<p role="status" className="zip-demo-message">{message}</p>}
        </section>
        <section className="zip-demo-panel"><h2>{dayItems.length} example appointment{dayItems.length===1?'':'s'} on {date.split('-').reverse().join('/')}</h2><div className="zip-demo-list">{dayItems.length?dayItems.map(item=><article key={item.id} className="zip-demo-item"><div><strong>{item.time} · {item.name}</strong><span>{item.service} · {item.practitioner}</span></div><div><button type="button" className="pill" onClick={()=>edit(item)}>Edit</button><button type="button" className="pill" onClick={()=>remove(item.id)}>Remove</button></div></article>):<p>There are no examples for this date. Try adding one above.</p>}</div></section>
        <p className="zip-demo-disclaimer">This is an isolated demo session. Real staff permissions, customer records, payments and owner settings are never available here.</p>
      </>}
    </div>
  </main>;
}
