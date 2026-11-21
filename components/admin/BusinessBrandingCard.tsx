'use client';

import { useEffect, useRef, useState } from 'react';
import { makeAdminAuthHeaders } from '@/components/admin/AdminAuthGate';
import { showAdminToast } from '@/components/admin/AdminToast';

type BrandingResult = {logoVersion:string|null;error?:string};
export function BusinessBrandingCard() {
  const [version,setVersion] = useState<string|null>(null);
  const [file,setFile] = useState<File|null>(null);
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const inputRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    let mounted=true;
    void fetch('/api/admin-branding',{headers:makeAdminAuthHeaders(),cache:'no-store'})
      .then(async response=>{const data=await response.json() as BrandingResult;if(!response.ok) throw new Error(data.error||'Could not load logo.');return data;})
      .then(data=>{if(mounted)setVersion(data.logoVersion);})
      .catch(caught=>{if(mounted)setError(caught instanceof Error?caught.message:'Could not load logo.');})
      .finally(()=>{if(mounted)setLoading(false);});
    return ()=>{mounted=false;};
  },[]);
  async function saveLogo() {
    if(!file || busy)return;
    setBusy(true);setError('');
    try {
      const body=new FormData();body.append('logo',file);
      const response=await fetch('/api/admin-branding',{method:'POST',headers:makeAdminAuthHeaders(),body});
      const data=await response.json() as BrandingResult;
      if(!response.ok)throw new Error(data.error||'Could not upload logo.');
      setVersion(data.logoVersion);setFile(null);if(inputRef.current)inputRef.current.value='';
      showAdminToast('Business logo saved. The booking page and new app installations now use your logo.');
    }catch(caught){setError(caught instanceof Error?caught.message:'Could not upload logo.');}
    finally {setBusy(false);}
  }
  async function removeLogo() {
    if(busy||!version)return;
    if(!window.confirm('Remove your business logo and use the standard ZipBook icon?'))return;
    setBusy(true);setError('');
    try {
      const response=await fetch('/api/admin-branding',{method:'DELETE',headers:makeAdminAuthHeaders()});
      const data=await response.json() as BrandingResult;
      if(!response.ok)throw new Error(data.error||'Could not remove logo.');
      setVersion(null);setFile(null);if(inputRef.current)inputRef.current.value='';
      showAdminToast('Business logo removed. ZipBook branding restored.');
    }catch(caught){setError(caught instanceof Error?caught.message:'Could not remove logo.');}
    finally{setBusy(false);}
  }
  return <section className="card clean-panel settings-054-section branding-060-section">
    <div className="settings-054-section-heading"><div>
      <span className="settings-054-eyebrow">Your business</span><h2>Booking page &amp; app logo</h2>
      <p>Upload your business logo once. It appears on your booking page and as the icon for newly installed booking apps.</p>
    </div></div>
    <div className="branding-060-content">
      <div className="branding-060-preview"><img key={version||'fallback'} src={version?`/api/branding/icon?size=192&v=${version}`:'/icons/icon-192.png'} alt={version?'Current business logo':'Default ZipBook logo'} width="96" height="96" /><span>{version?'Business logo active':'Default ZipBook icon'}</span></div>
      <div className="branding-060-controls">
        <label className="settings-054-field" htmlFor="branding-060-file"><span>Choose a logo</span>
          <input id="branding-060-file" ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy||loading} onChange={event=>{setFile(event.target.files?.[0]??null);setError('');}} />
        </label>
        <p className="mini-copy">PNG, JPG or WebP · up to 2 MB · at least 128 × 128 pixels. ZipBook fits the entire logo inside a square icon.</p>
        {file && <p className="mini-copy">Selected: {file.name}</p>}
        {error && <p className="notice warning" role="alert">{error}</p>}
        <div className="branding-060-actions">
          <button className="button primary" type="button" disabled={!file||busy||loading} onClick={()=>void saveLogo()}>{busy?'Saving…':'Upload logo'}</button>
          {version && <button className="pill" type="button" disabled={busy||loading} onClick={()=>void removeLogo()}>Remove logo</button>}
        </div>
        <p className="mini-copy">Existing installed apps may retain their old icon until reinstalled. No changes are made to your staff login or public booking permissions.</p>
      </div>
    </div>
  </section>;
}
