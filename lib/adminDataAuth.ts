import { NextRequest } from 'next/server';

export function verifyAdminDataKey(request: NextRequest) {
  const configuredKey = process.env.ZIPBOOK_ADMIN_DATA_KEY ?? '';
  const suppliedKey = request.headers.get('x-zipbook-admin-key') ?? request.nextUrl.searchParams.get('key') ?? '';

  if (!configuredKey) {
    if (process.env.NODE_ENV !== 'production' && suppliedKey === 'zipbook-admin-dev') return true;
    return false;
  }

  return suppliedKey.length > 0 && suppliedKey === configuredKey;
}
