export type BusinessInput={name:string;slug:string;ownerName:string;ownerEmail:string;timezone:string;currency:string;country:string};
export function isPlatformHost(raw:string|null,local?:boolean):boolean;
export function platformKeyMatches(expected:string|undefined,supplied:string|null):boolean;
export function makeInviteToken():string;
export function inviteHash(token:string):string;
export function isInviteToken(token:unknown):token is string;
export function validateBusiness(input:unknown):BusinessInput;
export function validOwnerPassword(password:unknown):password is string;
