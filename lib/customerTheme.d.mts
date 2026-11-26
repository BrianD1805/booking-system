export type CustomerTheme={primary:string;secondary:string;topRight:string;bottomLeft:string;background:string;panel:string;text:string;muted:string;border:string;scrollbar:string;font:string};
export const DEFAULT_THEME: Readonly<CustomerTheme>;
export const FONT_STACKS: Readonly<Record<string,string>>;
export function themeFontUrl(font:string):string|null;
export const COLOR_KEYS: readonly Exclude<keyof CustomerTheme,'font'>[];
export function luminance(c:string):number;
export function contrast(a:string,b:string):number;
export function validateTheme(value:unknown):CustomerTheme;
export function themeVariables(theme:CustomerTheme):Record<string,string>;
