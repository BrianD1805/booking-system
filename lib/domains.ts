export const APP_VERSION = 'Ver-0.007';

export const ZIPBOOK_DOMAINS = {
  client: 'https://zipbook.app',
  admin: 'https://admin.zipbook.app',
  www: 'https://www.zipbook.app',
  netlify: 'https://bookings-system.netlify.app'
} as const;

export const CLIENT_HOSTS = new Set(['zipbook.app', 'www.zipbook.app']);
export const ADMIN_HOSTS = new Set(['admin.zipbook.app']);

export function isLocalHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');
}

export function normaliseHost(host: string | null) {
  return (host || '').split(':')[0].toLowerCase();
}
