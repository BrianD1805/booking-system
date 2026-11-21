// Pure per-tenant branding rules. No passwords, external image URLs or tenant IDs from callers.
export const MAX_LOGO_UPLOAD_BYTES = 2_000_000;
export const MAX_LOGO_PIXELS = 16_000_000;
export const LOGO_DIMENSION = 512;
export const ALLOWED_LOGO_FORMATS = new Set(['png', 'jpeg', 'webp']);

export function validateLogoMetadata(metadata, bytes) {
  if (!Number.isInteger(bytes) || bytes < 1 || bytes > MAX_LOGO_UPLOAD_BYTES) throw new Error('Choose a PNG, JPEG or WebP image smaller than 2 MB.');
  if (!metadata || !ALLOWED_LOGO_FORMATS.has(metadata.format)) throw new Error('Only PNG, JPEG and WebP logos are accepted.');
  if (!Number.isInteger(metadata.width) || !Number.isInteger(metadata.height) || metadata.width < 128 || metadata.height < 128 || metadata.width * metadata.height > MAX_LOGO_PIXELS) {
    throw new Error('Logo dimensions must be at least 128 pixels and no more than 16 megapixels.');
  }
  if ((metadata.pages ?? 1) !== 1) throw new Error('Animated or multi-page images are not supported.');
  return true;
}

export function logoIconUrl(size, version) {
  if (![180, 192, 512].includes(size)) throw new Error('Invalid icon size.');
  return typeof version === 'string' && /^[0-9a-f-]{36}$/.test(version)
    ? `/api/branding/icon?size=${size}&v=${version}`
    : size === 180 ? '/apple-touch-icon.png' : `/icons/icon-${size}.png`;
}

export function businessManifest(name, logoVersion) {
  const title = typeof name === 'string' && name.trim() ? name.trim().slice(0, 80) : 'ZipBook';
  return {
    id: '/book', name: title === 'ZipBook' ? 'ZipBook' : `${title} Bookings`, short_name: title.slice(0, 24),
    description: `Book appointments with ${title}.`, start_url: '/book', scope: '/book',
    display: 'standalone', display_override: ['standalone', 'minimal-ui'], orientation: 'portrait',
    background_color: '#eff6ff', theme_color: '#336699', categories: ['health','productivity','business'],
    icons: [192, 512].map(size => ({src:logoIconUrl(size, logoVersion),sizes:`${size}x${size}`,type:'image/png'}))
  };
}
