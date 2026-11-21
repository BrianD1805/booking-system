export const MAX_LOGO_UPLOAD_BYTES: number;
export const MAX_LOGO_PIXELS: number;
export const LOGO_DIMENSION: number;
export const ALLOWED_LOGO_FORMATS: Set<string>;
export function validateLogoMetadata(metadata: {format?: string; width?: number; height?: number; pages?: number} | undefined, bytes: number): true;
export function logoIconUrl(size: number, version?: string | null): string;
export function businessManifest(name?: string | null, logoVersion?: string | null): {
  id: string; name: string; short_name: string; description: string; start_url: string;
  scope: string; display: string; display_override: string[]; orientation: string;
  background_color: string; theme_color: string; categories: string[];
  icons: {src:string;sizes:string;type:string}[];
};
