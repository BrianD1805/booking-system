import { getZipBookDatabase } from '@/lib/dbProvider';
import { currentTenant } from '@/lib/tenantScope.mjs';

type BrandingRecord = {logo_version:string};
export async function getLogoVersion(): Promise<string | null> {
  const rows = await getZipBookDatabase().sql<BrandingRecord>`
    SELECT logo_version FROM zipbook_business_branding
    WHERE practice_id=${currentTenant().practiceId} LIMIT 1`;
  return rows[0]?.logo_version ?? null;
}
export async function getLogoData(): Promise<Buffer | null> {
  const rows = await getZipBookDatabase().sql<{logo_data:Buffer}>`
    SELECT logo_data FROM zipbook_business_branding
    WHERE practice_id=${currentTenant().practiceId} LIMIT 1`;
  return rows[0]?.logo_data ?? null;
}
