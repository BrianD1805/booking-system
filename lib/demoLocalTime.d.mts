/** Display-only formatting for public demo sessions; real booking values stay in practice time. */
export function practiceTimeToInstant(practiceDate: string, practiceTime: string, practiceZone?: string): Date | null;
export function demoLocalParts(practiceDate: string, practiceTime: string, practiceZone: string, visitorZone?: string): {date:string;time:string} | null;
export function demoLocalTime(practiceDate: string, practiceTime: string, practiceZone: string, visitorZone?: string): string;
export function demoLocalRange(practiceDate: string, start: string, end: string, practiceZone: string, visitorZone?: string): string;
export function demoLocalDayLabel(practiceDate: string, practiceTime: string, practiceZone: string, visitorZone?: string): string;
