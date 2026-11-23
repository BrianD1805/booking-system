export const DEMO_SESSION_SECONDS:number;
export function issuePublicDemoSession(secret:string,now?:number):string;
export function readPublicDemoSession(secret:string,token:string,now?:number):{expiresAt:string}|null;
