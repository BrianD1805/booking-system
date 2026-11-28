'use client';

import {useRef,useState} from 'react';
import styles from '../landing.module.css';

export function InstallationCode({title,code}:{title:string;code:string}) {
  const field=useRef<HTMLTextAreaElement>(null);
  const [status,setStatus]=useState('');
  async function copy() {
    try { await navigator.clipboard.writeText(code);setStatus('Copied to clipboard.'); }
    catch { field.current?.focus();field.current?.select();setStatus('Code selected. Press Ctrl+C or use your device’s Copy command.'); }
  }
  return <details className={styles.installCode}>
    <summary>{title}</summary>
    <div className={styles.installCodeBody}>
      <button type="button" className={`${styles.btn} ${styles.secondary}`} onClick={()=>void copy()}>Copy code</button>
      <textarea ref={field} readOnly value={code} rows={Math.min(12,Math.max(3,code.split('\n').length))} aria-label={title} spellCheck={false}/>
      <p role="status" aria-live="polite">{status}</p>
    </div>
  </details>;
}
