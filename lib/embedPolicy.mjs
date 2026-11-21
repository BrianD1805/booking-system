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
  return `<iframe src="${booking}" title="Book an appointment" loading="lazy" width="100%" height="850" style="border:0;max-width:100%;" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}

export function adminHtmlSnippet(slug) {
  const {diary} = businessEmbedUrls(slug);
  return `<iframe src="${diary}" title="Secure staff diary" width="100%" height="900" style="border:0;max-width:100%;" referrerpolicy="strict-origin-when-cross-origin"></iframe>\n<p><a href="${diary}" target="_blank" rel="noopener noreferrer">Open the secure staff diary in a new tab</a></p>`;
}

export function reactEmbedSnippet(slug, kind) {
  const urls = businessEmbedUrls(slug);
  const admin = kind === 'admin';
  const lines = [
    ...(admin ? ['<>'] : []),
    '<iframe',
    `  src="${admin ? urls.diary : urls.booking}"`,
    `  title="${admin ? 'Secure staff diary' : 'Book an appointment'}"`,
    `  style={{ width: '100%', minHeight: '${admin ? '900px' : '850px'}', border: 0 }}`,
    '  referrerPolicy="strict-origin-when-cross-origin"',
    ...(admin ? [] : ['  loading="lazy"']),
    '/>'
  ];
  if (admin) {
    lines.push(`<a href="${urls.diary}" target="_blank" rel="noopener noreferrer">Open staff diary in a new tab</a>`);
    lines.push('</>');
  }
  return lines.join('\n');
}
