import type {CustomerTheme} from './customerTheme.mjs';
export function publicIPv4(ip:string):boolean;
export function checkedWebsiteUrl(input:string):URL;
export function extractStyleSuggestions(source:string):{theme:CustomerTheme;palette:string[];fonts:string[]};
export function analyseWebsite(input:string):Promise<{theme:CustomerTheme;palette:string[];fonts:string[];stylesheets:number;warning:string}>;
