'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Header } from '@/components/Header';
import { APP_VERSION } from '@/lib/domains';
import { makeAdminAuthHeaders } from '@/components/admin/AdminAuthGate';
import { showAdminToast } from '@/components/admin/AdminToast';
import { normaliseWebsiteOrigin, businessEmbedUrls, bookingHtmlSnippet, adminHtmlSnippet, reactEmbedSnippet } from '@/lib/embedPolicy.mjs';

type Website = {id:string;origin:string;public_embed_enabled:boolean;admin_embed_enabled:boolean};
type Payload = {tenantSlug:string;name:string;publicBookings:boolean;websites:Website[]};
type Editor = {id?:string;origin:string;publicEnabled:boolean;adminEnabled:boolean};
const blank:Editor={origin:'https://',publicEnabled:true,adminEnabled:false};

function CopyPanel({name,description,content,disabled=false}:{name:string;description:string;content:string;disabled?:boolean}) {
  const [copied,setCopied]=useState(false);
  async function copy() {
    try {await navigator.clipboard.writeText(content);setCopied(true);showAdminToast(`${name} copied.`);} catch {showAdminToast('Unable to copy automatically. Select and copy the text below.','warning');}
  }
  return <article className="embed-058-snippet">
    <div className="embed-058-snippet-heading"><div><h3>{name}</h3><p>{description}</p></div><button type="button" className="pill" onClick={()=>void copy()} disabled={disabled}>{copied?'Copied':'Copy'}</button></div>
    <textarea readOnly rows={content.includes('\n')?8:3} value={disabled?'Authorise a website with the appropriate permission to enable this snippet.':content} aria-label={`${name} code`} onFocus={event=>event.currentTarget.select()} />
  </article>;
}

export default function WebsiteIntegrationsPage() {
  const [data,setData]=useState<Payload|null>(null);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [editor,setEditor]=useState<Editor|null>(null);
  const [removing,setRemoving]=useState<Website|null>(null);
  const load=useCallback(async()=>{
    try {
      const response=await fetch('/api/admin-integrations',{headers:makeAdminAuthHeaders(),cache:'no-store'});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||'Could not load website integration settings.');
      setData(result as Payload);setError('');
    } catch(err){setError(err instanceof Error?err.message:'Unable to load website settings.');}
    finally {setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{
    if(!editor&&!removing) return;
    const before=document.body.style.overflow;
    document.body.style.overflow='hidden';
    function esc(e:KeyboardEvent){if(e.key==='Escape'&&!busy){setEditor(null);setRemoving(null);}}
    document.addEventListener('keydown',esc);
    return()=>{document.body.style.overflow=before;document.removeEventListener('keydown',esc);};
  },[editor,removing,busy]);
  async function send(payload:object) {
    setBusy(true);setError('');
    try {
      const response=await fetch('/api/admin-integrations',{method:'POST',headers:{'Content-Type':'application/json',...makeAdminAuthHeaders()},body:JSON.stringify(payload)});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||'Could not save.');
      setEditor(null);setRemoving(null);
      showAdminToast('Website integration settings saved.');
      await load();
    } catch(err) {setError(err instanceof Error?err.message:'Save failed.');}
    finally {setBusy(false);}
  }
  function save(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!editor)return;
    try {const origin=normaliseWebsiteOrigin(editor.origin);void send({action:'save',id:editor.id,origin,publicEnabled:editor.publicEnabled,adminEnabled:editor.adminEnabled});}
    catch(err){setError(err instanceof Error?err.message:'Invalid website address.');}
  }
  const slug=data?.tenantSlug??'';
  const urls=slug?businessEmbedUrls(slug):null;
  const allowedPublic=!!data?.websites.some(x=>x.public_embed_enabled);
  const allowedAdmin=!!data?.websites.some(x=>x.admin_embed_enabled);
  return <main className="shell fresh-shell admin-shell settings-054-page embed-058-page">
    <Header area="admin" />
    <section className="admin-command settings-054-heading">
      <div><p className="badge blue-badge">Website integration · {APP_VERSION}</p><h1 className="hero-title clean-title">Connect your website</h1><p className="hero-copy tight-copy">Add ZipBook bookings or your secure staff diary to a website you already own. Choose a booking link, an HTML snippet or direct code integration.</p></div>
      <button className="pill" type="button" disabled={loading||busy} onClick={()=>void load()}>Refresh</button>
    </section>
    {error&&<div className="notice warning" role="alert">{error}</div>}
    {loading&&<p role="status">Loading website settings…</p>}
    {data&&urls&&<>
      <section className="card clean-panel settings-054-section">
        <div className="settings-054-section-heading"><div><span className="settings-054-eyebrow">Step 1</span><h2>Authorised websites</h2><p>Only the exact HTTPS website addresses you approve may display your embedded booking page or private diary. You can authorise up to ten websites.</p></div><button type="button" className="button primary" onClick={()=>{setError('');setEditor({...blank});}} disabled={data.websites.length>=10}>Add website</button></div>
        {data.websites.length? <div className="settings-054-list">{data.websites.map(website=><article className="settings-054-list-item" key={website.id}>
          <div><strong>{website.origin}</strong><p>Public bookings: {website.public_embed_enabled?'Allowed':'Blocked'} · Staff diary: {website.admin_embed_enabled?'Allowed':'Blocked'}</p></div>
          <div className="settings-054-list-actions"><button className="pill" type="button" onClick={()=>{setError('');setEditor({id:website.id,origin:website.origin,publicEnabled:website.public_embed_enabled,adminEnabled:website.admin_embed_enabled});}}>Edit</button><button className="pill" type="button" onClick={()=>{setError('');setRemoving(website);}}>Remove</button></div>
        </article>)}</div>:<p className="settings-054-empty">No authorised website yet. Embedded pages are blocked until you add one.</p>}
        <p className="mini-copy">Enter the website’s origin, for example https://www.example.com. Add both www and non-www addresses if visitors use both. Changes to authorised domains take effect on the next page load.</p>
      </section>
      <section className="card clean-panel settings-054-section">
        <div className="settings-054-section-heading"><div><span className="settings-054-eyebrow">Step 2</span><h2>Booking link and button</h2><p>A simple link works with almost every website builder, email campaign or hand-coded site. No iframe permission is necessary.</p></div></div>
        {!data.publicBookings&&<div className="notice soft" role="status">Online bookings are not published for this business yet. You can prepare the link, but customers cannot book until public bookings are enabled.</div>}
        <CopyPanel name="Direct booking URL" description="Use this as the destination of a Book now button." content={urls.booking}/>
        <CopyPanel name="HTML booking button" description="Paste into an HTML block or your site's source." content={`<a href="${urls.booking}" target="_blank" rel="noopener noreferrer">Book an appointment</a>`}/>
      </section>
      <section className="card clean-panel settings-054-section">
        <div className="settings-054-section-heading"><div><span className="settings-054-eyebrow">Step 3</span><h2>Embed public bookings</h2><p>Paste the snippet into a custom HTML block in a website builder or an HTML file. Enable public-booking permission for that website first.</p></div></div>
        <CopyPanel name="HTML booking iframe" description="Responsive booking iframe with automatic height and host-page scrolling. Paste the complete HTML including the script." content={bookingHtmlSnippet(slug)} disabled={!allowedPublic}/>
        <CopyPanel name="React / Next.js booking component" description="Save the complete snippet as ZipBookBooking.jsx and render it in your page. It includes automatic height and host-page scrolling." content={reactEmbedSnippet(slug,'public')} disabled={!allowedPublic}/>
      </section>
      <section className="card clean-panel settings-054-section">
        <div className="settings-054-section-heading"><div><span className="settings-054-eyebrow">Step 4</span><h2>Secure staff diary</h2><p>For authorised staff only. Website visitors see the staff sign-in screen, never client records. Give diary embedding permission only to websites you trust and control.</p></div></div>
        <div className="notice soft">Some browsers restrict login storage inside third-party iframes. The snippet includes a direct, secure full-page sign-in link as a fallback. Do not use a public booking iframe as an administrative shortcut.</div>
        <CopyPanel name="Staff diary URL" description="Always available after staff authentication." content={urls.diary}/>
        <CopyPanel name="HTML staff diary iframe" description="Includes a secure full-page fallback link." content={adminHtmlSnippet(slug)} disabled={!allowedAdmin}/>
        <CopyPanel name="React / Next.js staff diary component" description="For hand-coded websites supporting JSX." content={reactEmbedSnippet(slug,'admin')} disabled={!allowedAdmin}/>
      </section>
    </>}
    {(editor||removing)&&createPortal(<div className="settings-054-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy){setEditor(null);setRemoving(null);}}}>
      <form className="settings-054-modal" role="dialog" aria-modal="true" aria-label={removing?'Remove authorised website':'Edit authorised website'} onSubmit={e=>removing?(e.preventDefault(),void send({action:'remove',id:removing.id})):save(e)}>
        <header className="settings-054-modal-head"><div><h2>{removing?'Remove website':editor?.id?'Edit authorised website':'Add authorised website'}</h2><p>{removing?'This immediately blocks future embedding from this website.':'Choose precisely what the website is allowed to embed.'}</p></div><button className="settings-054-close" type="button" aria-label="Close popup" disabled={busy} onClick={()=>{setEditor(null);setRemoving(null);}}>×</button></header>
        <div className="settings-054-modal-scroll">
          {error&&<div className="notice warning" role="alert">{error}</div>}
          {removing?<p>Remove permission for <strong>{removing.origin}</strong>?</p>: editor&&<div className="embed-058-modal-fields">
            <label htmlFor="embed-website-origin">Website address (HTTPS)</label><input id="embed-website-origin" type="url" required value={editor.origin} placeholder="https://www.example.com" onChange={e=>setEditor({...editor,origin:e.target.value})}/>
            <label className="embed-058-toggle"><input type="checkbox" checked={editor.publicEnabled} onChange={e=>setEditor({...editor,publicEnabled:e.target.checked})}/><span><strong>Allow public booking iframe</strong><small>Visitors can book appointments on this website.</small></span></label>
            <label className="embed-058-toggle"><input type="checkbox" checked={editor.adminEnabled} onChange={e=>setEditor({...editor,adminEnabled:e.target.checked})}/><span><strong>Allow secure staff diary iframe</strong><small>Staff must still sign in with their own credentials.</small></span></label>
          </div>}
        </div>
        <footer className="settings-054-modal-footer"><button type="button" className="pill" disabled={busy} onClick={()=>{setEditor(null);setRemoving(null);}}>Cancel</button><button type="submit" className={`button ${removing?'danger':'primary'}`} disabled={busy}>{busy?'Saving…':removing?'Remove website':'Save website'}</button></footer>
      </form>
    </div>,document.body)}
  </main>;
}
