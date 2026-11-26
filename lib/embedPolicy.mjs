import {attachBookingEmbed} from './bookingEmbed.mjs';
// Shared validation for owner-supplied website origins and frame policies.
// Only HTTPS origins are accepted: no wildcards, paths, ports, query strings or IPs.
export function normaliseWebsiteOrigin(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 255) throw new Error('Enter a complete HTTPS website address, such as https://www.example.com.');
  const input = value.trim();
  let url;
  try { url = new URL(input); } catch { throw new Error('Enter a valid website address beginning with https://.'); }
  const name = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname) || url.port || !name.includes('.') || name.length > 253 ||
      name.endsWith('.zipbook.app') || name === 'zipbook.app' || name === 'localhost' || name.endsWith('.localhost') ||
      /^\d+\.\d+\.\d+\.\d+$/.test(name) || name.includes('..') ||
      !name.split('.').every(part => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(part))) {
    throw new Error('Enter a secure public HTTPS website origin without a path, port or wildcard.');
  }
  return `https://${name}`;
}


// Check CSRF Origin against the *verified tenant hostname* and the actual Host
// header. Do not compare with NextRequest.nextUrl.origin: on Netlify it may
// represent an internal rewrite/backend origin instead of the browser URL.
// The tenant has already been resolved from the Host by withTenantRequest.
export function permittedIntegrationWriteOrigin(originHeader, requestHost, tenantHost, production = true) {
  if (typeof originHeader !== 'string' || typeof requestHost !== 'string' || typeof tenantHost !== 'string') return false;
  try {
    const origin = new URL(originHeader);
    // Browser Origin must be an origin alone, not a URL with a path or user info.
    if (originHeader !== origin.origin || origin.username || origin.password) return false;
    const expectedHost = tenantHost.toLowerCase();
    const requestAuthority = new URL(`http://${requestHost}`);
    // Host must be a single host[:port], and must still be the resolved tenant.
    if (requestHost.toLowerCase() !== requestAuthority.host || requestAuthority.hostname !== expectedHost || origin.hostname !== expectedHost) return false;
    if (production) {
      // Production business domains have HTTPS without a custom port.
      return expectedHost.endsWith('.zipbook.app') && origin.protocol === 'https:' && origin.port === '' && requestAuthority.port === '';
    }
    // Local development supports .localhost with matching explicit ports.
    if (expectedHost.endsWith('.localhost')) return ['http:', 'https:'].includes(origin.protocol) && origin.host === requestAuthority.host;
    // Even in development, live business domains must remain HTTPS.
    return expectedHost.endsWith('.zipbook.app') && origin.protocol === 'https:' && origin.port === '' && requestAuthority.port === '';
  } catch { return false; }
}

export function frameAncestorsForDomains(rows, kind) {
  if (!['admin', 'public'].includes(kind) || !Array.isArray(rows)) return "frame-ancestors 'none'";
  const flag = kind === 'admin' ? 'admin_embed_enabled' : 'public_embed_enabled';
  const origins = [...new Set(rows.filter(row => row?.[flag] === true).map(row => {
    try { return normaliseWebsiteOrigin(row.origin); } catch { return null; }
  }).filter(Boolean))].slice(0, 10);
  return origins.length ? `frame-ancestors ${origins.join(' ')}` : "frame-ancestors 'none'";
}

// Validate the same-origin server response before setting a CSP header in
// the lightweight Proxy. Malformed responses can never grant framing access.
export function safeRemoteFramePolicy(payload) {
  const deny = "frame-ancestors 'none'";
  const value = payload && typeof payload === 'object' ? payload.policy : null;
  if (value === deny) return deny;
  if (typeof value !== 'string' || value.length > 2600 || !value.startsWith('frame-ancestors ')) return deny;
  const origins = value.slice('frame-ancestors '.length).split(' ');
  if (origins.length < 1 || origins.length > 10 || origins.some(o => !o)) return deny;
  try {
    const verified = origins.map(origin => normaliseWebsiteOrigin(origin));
    if (verified.some((origin, i) => origin !== origins[i])) return deny;
    return `frame-ancestors ${[...new Set(verified)].join(' ')}`;
  } catch { return deny; }
}

export function validBusinessSlug(slug) {
  return typeof slug === 'string' && /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/.test(slug) && !['admin','www','platform','mail','api'].includes(slug);
}

export function businessEmbedUrls(slug) {
  if (!validBusinessSlug(slug)) throw new Error('Invalid business address.');
  const base = `https://${slug}.zipbook.app`;
  return { booking: `${base}/book`, diary: `${base}/admin` };
}

export function bookingHtmlSnippet(slug) {
  const {booking} = businessEmbedUrls(slug);
  return `<div data-zipbook-booking>\n  <iframe src="${booking}?embed=1" title="Book an appointment" loading="eager" width="100%" height="850" style="display:block;border:0;max-width:100%;background:transparent;" referrerpolicy="strict-origin-when-cross-origin"></iframe>\n  <p><a href="${booking}" target="_blank" rel="noopener noreferrer">Open booking page in a new tab</a></p>\n</div>\n<script>\n(function(){\n  const frame = document.currentScript?.previousElementSibling?.querySelector('iframe');\n  if (frame) (${attachBookingEmbed.toString()})(frame);\n})();\n</script>`;
}

export function adminHtmlSnippet(slug) {
  const {diary} = businessEmbedUrls(slug);
  return `<iframe src="${diary}" title="Secure staff diary" width="100%" height="900" style="border:0;max-width:100%;" referrerpolicy="strict-origin-when-cross-origin"></iframe>\n<p><a href="${diary}" target="_blank" rel="noopener noreferrer">Open the secure staff diary in a new tab</a></p>`;
}

export function reactEmbedSnippet(slug, kind) {
  const urls = businessEmbedUrls(slug);
  const admin = kind === 'admin';
  if (!admin) return `'use client';\nimport { useEffect, useRef } from 'react';\n\nconst attachBookingEmbed = (${attachBookingEmbed.toString()});\n\n// Save as ZipBookBooking.jsx, then import and render <ZipBookBooking />.\nexport default function ZipBookBooking() {\n  const frame = useRef(null);\n  useEffect(() => { if (frame.current) return attachBookingEmbed(frame.current); }, []);\n  return (\n    <div>\n      <iframe ref={frame} src="${urls.booking}?embed=1" title="Book an appointment" loading="eager" style={{ display: 'block', width: '100%', height: '850px', maxWidth: '100%', border: 0, background: 'transparent' }} referrerPolicy="strict-origin-when-cross-origin" />\n      <p><a href="${urls.booking}" target="_blank" rel="noopener noreferrer">Open booking page in a new tab</a></p>\n    </div>\n  );\n}`;
  const lines = [
    ...(admin ? ['<>'] : []),
    '<iframe',
    `  src="${admin ? urls.diary : urls.booking}"`,
    `  title="${admin ? 'Secure staff diary' : 'Book an appointment'}"`,
    `  style={{ width: '100%', minHeight: '${admin ? '900px' : '850px'}', border: 0 }}`,
    '  referrerPolicy="strict-origin-when-cross-origin"',
    ...(admin ? [] : ['  loading="eager"']),
    '/>'
  ];
  if (admin) {
    lines.push(`<a href="${urls.diary}" target="_blank" rel="noopener noreferrer">Open staff diary in a new tab</a>`);
    lines.push('</>');
  }
  return lines.join('\n');
}
