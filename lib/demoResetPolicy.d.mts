export type DemoSettings={
  workingDays:number[];workingStartTime:string;workingEndTime:string;
  slotIntervalMinutes:number;minimumNoticeHours:number;maxBookingAheadDays:number;
  lunchBreakEnabled:boolean;lunchBreakStart:string;lunchBreakEnd:string;
  allowSameDayBookings:boolean;cancellationPolicyNote:string;clientPhoneCountryCode:string;
  timezone:string;currencyCode:string;
};
export function demoResetAllowedIds(raw:unknown):string[];
export const DEMO_SETTING_KEYS:readonly string[];
export function validateDemoSettings(input:unknown):DemoSettings;
export function assertDemoResetConfirmation(value:unknown,acknowledged:unknown):void;
