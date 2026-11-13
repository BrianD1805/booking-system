export function minutes(time: string): number;
export function overlaps(startA: string, endA: string, startB: string, endB: string): boolean;
export function insideHours(start: string, end: string, open: string, close: string): boolean;
export function crossesLunch(start: string, end: string, enabled: boolean | undefined, lunchStart: string | undefined, lunchEnd: string | undefined): boolean;
export function dayOfWeek(isoDate: string): number;
