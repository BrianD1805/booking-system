'use client';
import {useEffect, useRef, useState} from 'react';
import {allowedEmbedParent} from '@/lib/bookingEmbed.mjs';
import {safeRemoteFramePolicy} from '@/lib/embedPolicy.mjs';

export function useBookingEmbed(view: string, contentReady: boolean) {
  const root = useRef<HTMLElement>(null);
  const [embedded, setEmbedded] = useState(false);
  const parentOrigin = useRef('');
  const previousView = useRef(view);
  const readyRef = useRef(contentReady);
  useEffect(()=>{readyRef.current=contentReady;},[contentReady]);
  const send = (type: string, payload: object = {}) => {
    if (parentOrigin.current) window.parent.postMessage({type,...payload}, parentOrigin.current);
  };
  useEffect(() => {
    if (window.parent === window || new URLSearchParams(window.location.search).get('embed') !== '1') return;
    let alive = true;
    let pending: Promise<string> | undefined;
    const controller = new AbortController();
    async function receive(event: MessageEvent) {
      if (event.source !== window.parent || !event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'zipbook:embed:hello') {
        if (!pending) pending = fetch('/api/embed-frame-policy?kind=public',{cache:'no-store',signal:controller.signal})
          .then(r=>r.ok?r.json():null).then(safeRemoteFramePolicy).catch(()=>"frame-ancestors 'none'");
        const policy = await pending;
        if (!alive || !allowedEmbedParent(policy,event.origin) || (parentOrigin.current && parentOrigin.current !== event.origin)) return;
        parentOrigin.current = event.origin;
        setEmbedded(true);
        send('zipbook:embed:ready');
        // A load event or a remounted host listener may repeat the handshake.
        requestAnimationFrame(()=>{const element=root.current;if(alive && element?.classList.contains('zb-book-embedded'))send('zipbook:embed:height',{height:Math.ceil(element.getBoundingClientRect().bottom+window.scrollY),contentReady:readyRef.current});});
      } else if (event.origin === parentOrigin.current && event.data.type === 'zipbook:embed:viewport') {
        const {top,height} = event.data;
        if (!Number.isFinite(top) || !Number.isFinite(height)) return;
        const t = Math.max(0,Math.min(window.innerHeight,top));
        const h = Math.max(0,Math.min(window.innerHeight-t,height));
        // Ignore fully offscreen reports: keep the last usable popup area.
        if (h > 40) {
          const style=document.documentElement.style;
          const values=[['--zb-embed-view-top',`${Math.round(t)}px`],['--zb-embed-view-height',`${Math.round(h)}px`],['--zb-embed-view-bottom',`${Math.max(0,Math.round(window.innerHeight-t-h))}px`]];
          let changed=false;
          for(const [key,value] of values) if(style.getPropertyValue(key)!==value){style.setProperty(key,value);changed=true;}
          document.documentElement.toggleAttribute('data-zb-embed-roomy',h>=440);
          if(changed) window.dispatchEvent(new Event('zipbook:embed:viewportchange'));
        }
      }
    }
    window.addEventListener('message',receive);
    return () => {
      alive=false; controller.abort(); window.removeEventListener('message',receive);
      parentOrigin.current='';
      document.documentElement.style.removeProperty('--zb-embed-view-top');
      document.documentElement.style.removeProperty('--zb-embed-view-height');
      document.documentElement.style.removeProperty('--zb-embed-view-bottom');
      document.documentElement.removeAttribute('data-zb-embed-roomy');
    };
  },[]);
  useEffect(()=>{
    if (!embedded || !root.current) return;
    let frame=0, last=0;
    const measure=()=>{
      frame=0;
      const element=root.current;
      if (!element) return;
      // Measure the content root, never documentElement.scrollHeight (it is
      // at least the iframe viewport height and therefore cannot shrink).
      const height=Math.ceil(element.getBoundingClientRect().bottom+window.scrollY);
      if (height>0 && height!==last) {last=height;send('zipbook:embed:height',{height,contentReady});}
    };
    const queue=()=>{if (!frame) frame=requestAnimationFrame(measure);};
    const observer=new ResizeObserver(queue);observer.observe(root.current);
    const mutation=new MutationObserver(queue);mutation.observe(root.current,{childList:true,subtree:true,characterData:true});
    window.addEventListener('resize',queue);
    document.fonts?.addEventListener('loadingdone',queue);
    queue();
    // Pass vertical wheel gestures to the host only when nothing in this
    // document can consume them. Keep genuine list/calendar scroll intact.
    function wheel(event:WheelEvent) {
      if (event.defaultPrevented || !event.cancelable || event.ctrlKey || event.shiftKey || !event.deltaY || Math.abs(event.deltaX)>Math.abs(event.deltaY)) return;
      for (const item of event.composedPath()) {
        if (!(item instanceof HTMLElement)) continue;
        if (/auto|scroll/.test(getComputedStyle(item).overflowY) && item.scrollHeight>item.clientHeight+1 &&
            (event.deltaY>0?item.scrollTop+item.clientHeight<item.scrollHeight-1:item.scrollTop>1)) return;
      }
      const scroller=document.scrollingElement;
      if (scroller && (event.deltaY>0?scroller.scrollTop+window.innerHeight<scroller.scrollHeight-1:scroller.scrollTop>1)) return;
      event.preventDefault();
      send('zipbook:embed:wheel',{delta:event.deltaY*(event.deltaMode===1?(parseFloat(getComputedStyle(document.body).lineHeight)||16):event.deltaMode===2?window.innerHeight:1)});
    }
    window.addEventListener('wheel',wheel,{passive:false});
    return()=>{observer.disconnect();mutation.disconnect();window.removeEventListener('resize',queue);document.fonts?.removeEventListener('loadingdone',queue);window.removeEventListener('wheel',wheel);if(frame)cancelAnimationFrame(frame);};
  },[embedded,contentReady]);
  useEffect(()=>{
    if (embedded && previousView.current!==view) send('zipbook:embed:reveal');
    previousView.current=view;
  },[embedded,view]);
  return {embedded,root};
}
