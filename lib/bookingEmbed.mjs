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
  const loader = frame.parentElement?.querySelector?.('[data-zipbook-loading]');
  let ready = false, raf = 0, scrollRaf = 0, pendingScroll = 0, lastTick = 0, loadingTimer = 0;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const send = (type, data = {}) => frame.contentWindow?.postMessage({type, ...data}, origin);
  const hello = () => send('zipbook:embed:hello');
  function showLoading() {
    if (!loader) return;
    window.clearTimeout(loadingTimer);
    loader.hidden = false;
    loader.dataset.state = 'loading';
    loader.querySelector('[data-zipbook-loading-text]').textContent = 'Loading your booking app…';
    frame.style.visibility = 'hidden';
    frame.setAttribute('aria-busy','true');
    loadingTimer = window.setTimeout(() => {
      loader.dataset.state = 'slow';
      loader.querySelector('[data-zipbook-loading-text]').textContent = 'Still connecting. You can open the booking page directly using the link below.';
      frame.style.visibility = '';
      frame.removeAttribute('aria-busy');
    }, 25000);
  }
  function finishLoading() {
    if (!loader || loader.hidden) return;
    window.clearTimeout(loadingTimer);
    loader.hidden = true;
    frame.style.visibility = '';
    frame.removeAttribute('aria-busy');
  }
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
    // Consume only the available distance in nested host scrollers and pass
    // any remaining distance on to the page, without starting a new animation.
    let remaining = delta;
    for (let el = frame.parentElement; el && Math.abs(remaining) > .01; el = el.parentElement) {
      if (el === document.scrollingElement || el === document.body || el === document.documentElement) continue;
      if (!/auto|scroll/.test(getComputedStyle(el).overflowY) || el.scrollHeight <= el.clientHeight) continue;
      const old = el.scrollTop;
      const target = clamp(old + remaining,0,el.scrollHeight-el.clientHeight);
      el.scrollTo({top:target,behavior:'instant'});
      remaining -= el.scrollTop-old;
    }
    if (Math.abs(remaining) > .01) window.scrollBy({top:remaining, behavior:'instant'});
  }
  function stopScroll() {
    if (scrollRaf) window.cancelAnimationFrame(scrollRaf);
    scrollRaf = 0; pendingScroll = 0; lastTick = 0;
  }
  function animateScroll(now) {
    scrollRaf = 0;
    const dt = lastTick ? clamp(now-lastTick,1,50) : 16.67;
    lastTick = now;
    // Exponential easing over consecutive animation frames. Accumulate wheel
    // input instead of restarting a browser smooth-scroll for every notch.
    // Browsers may quantise scroll offsets to whole pixels. Use integer
    // steps and carry the residual, so small easing steps are not lost.
    const magnitude = Math.abs(pendingScroll);
    const delta = Math.sign(pendingScroll)*Math.min(Math.round(magnitude),Math.max(1,Math.round(magnitude*(1-Math.exp(-dt/55)))));
    pendingScroll = magnitude <= 1 ? 0 : pendingScroll-delta;
    if (delta) scrollHost(delta);
    if (Math.abs(pendingScroll) > .01) scrollRaf = window.requestAnimationFrame(animateScroll);
    else { pendingScroll = 0; lastTick = 0; }
  }
  function queueScroll(delta) {
    if (!delta) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { stopScroll(); scrollHost(delta); return; }
    // A direction change cancels old momentum rather than fighting the user.
    if (pendingScroll && Math.sign(pendingScroll)!==Math.sign(delta)) pendingScroll=0;
    pendingScroll=clamp(pendingScroll+delta,-2400,2400);
    if (!scrollRaf) scrollRaf=window.requestAnimationFrame(animateScroll);
  }
  function receive(event) {
    if (event.origin !== origin || event.source !== frame.contentWindow || !event.data || typeof event.data !== 'object') return;
    const d = event.data;
    if (d.type === 'zipbook:embed:ready') { ready = true; queueViewport(); return; }
    if (!ready) return;
    if (d.type === 'zipbook:embed:height' && Number.isFinite(d.height) && d.height > 0) {
      const px = Math.ceil(clamp(d.height, 240, 16000)) + 'px';
      if (frame.style.height !== px) frame.style.height = px;
      if (d.contentReady === true) finishLoading();
      queueViewport();
    } else if (d.type === 'zipbook:embed:wheel' && Number.isFinite(d.delta)) {
      queueScroll(clamp(d.delta, -1200, 1200));
    } else if (d.type === 'zipbook:embed:reveal') {
      stopScroll();
      const rect = frame.getBoundingClientRect();
      const h = window.visualViewport?.height ?? window.innerHeight;
      if (rect.top < 0 || rect.top > h - Math.min(180,h/2)) frame.scrollIntoView({block:'start',behavior:'instant'});
      queueViewport();
    }
  }
  function loaded() { ready = false; stopScroll(); showLoading(); hello(); }
  window.addEventListener('message', receive);
  window.addEventListener('scroll', queueViewport, true);
  window.addEventListener('resize', queueViewport);
  window.addEventListener('wheel', stopScroll, {passive:true});
  window.addEventListener('pointerdown', stopScroll, {passive:true});
  window.visualViewport?.addEventListener('resize', queueViewport);
  window.visualViewport?.addEventListener('scroll', queueViewport);
  frame.addEventListener('load', loaded);
  const timer = window.setInterval(() => { if (!ready) hello(); }, 600);
  showLoading(); hello();
  return () => {
    window.clearInterval(timer); window.clearTimeout(loadingTimer); if (raf) window.cancelAnimationFrame(raf); stopScroll();
    window.removeEventListener('message', receive);
    window.removeEventListener('scroll', queueViewport, true);
    window.removeEventListener('resize', queueViewport);
    window.removeEventListener('wheel', stopScroll);
    window.removeEventListener('pointerdown', stopScroll);
    window.visualViewport?.removeEventListener('resize', queueViewport);
    window.visualViewport?.removeEventListener('scroll', queueViewport);
    frame.removeEventListener('load', loaded);
  };
}
