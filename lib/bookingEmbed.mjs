// Public presentation-only protocol. No account, booking or credential data.
export const EMBED_MIN_HEIGHT = 240;
export const EMBED_MAX_HEIGHT = 16000;
export function allowedEmbedParent(policy, origin) {
  return typeof origin === 'string' && typeof policy === 'string' &&
    policy.startsWith('frame-ancestors ') && policy.slice(16).split(' ').includes(origin) && origin.startsWith('https://');
}

// Serialized into both generated snippets; keep this function self-contained.
export function attachBookingEmbed(frame) {
  const origin = new URL(frame.src).origin;
  let ready = false, raf = 0;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const send = (type, data = {}) => frame.contentWindow?.postMessage({type, ...data}, origin);
  const hello = () => send('zipbook:embed:hello');
  function viewport() {
    raf = 0;
    if (!ready) return;
    const rect = frame.getBoundingClientRect();
    const height = window.visualViewport?.height ?? window.innerHeight;
    const offset = window.visualViewport?.offsetTop ?? 0;
    const top = clamp(offset - rect.top, 0, rect.height);
    const bottom = clamp(offset + height - rect.top, top, rect.height);
    send('zipbook:embed:viewport', {top, height:bottom-top});
  }
  function queueViewport() { if (!raf) raf = window.requestAnimationFrame(viewport); }
  function scrollHost(delta) {
    for (let el = frame.parentElement; el; el = el.parentElement) {
      if (/auto|scroll/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight &&
          (delta > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 1)) {
        el.scrollTop += delta; return;
      }
    }
    window.scrollBy({top:delta, behavior:'instant'});
  }
  function receive(event) {
    if (event.origin !== origin || event.source !== frame.contentWindow || !event.data || typeof event.data !== 'object') return;
    const d = event.data;
    if (d.type === 'zipbook:embed:ready') { ready = true; queueViewport(); return; }
    if (!ready) return;
    if (d.type === 'zipbook:embed:height' && Number.isFinite(d.height) && d.height > 0) {
      const px = Math.ceil(clamp(d.height, 240, 16000)) + 'px';
      if (frame.style.height !== px) frame.style.height = px;
      queueViewport();
    } else if (d.type === 'zipbook:embed:wheel' && Number.isFinite(d.delta)) {
      scrollHost(clamp(d.delta, -1200, 1200));
    } else if (d.type === 'zipbook:embed:reveal') {
      const rect = frame.getBoundingClientRect();
      const h = window.visualViewport?.height ?? window.innerHeight;
      if (rect.top < 0 || rect.top > h - Math.min(180,h/2)) frame.scrollIntoView({block:'start',behavior:'instant'});
      queueViewport();
    }
  }
  function loaded() { ready = false; hello(); }
  window.addEventListener('message', receive);
  window.addEventListener('scroll', queueViewport, true);
  window.addEventListener('resize', queueViewport);
  window.visualViewport?.addEventListener('resize', queueViewport);
  window.visualViewport?.addEventListener('scroll', queueViewport);
  frame.addEventListener('load', loaded);
  const timer = window.setInterval(() => { if (!ready) hello(); }, 600);
  hello();
  return () => {
    window.clearInterval(timer); if (raf) window.cancelAnimationFrame(raf);
    window.removeEventListener('message', receive);
    window.removeEventListener('scroll', queueViewport, true);
    window.removeEventListener('resize', queueViewport);
    window.visualViewport?.removeEventListener('resize', queueViewport);
    window.visualViewport?.removeEventListener('scroll', queueViewport);
    frame.removeEventListener('load', loaded);
  };
}
