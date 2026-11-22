export type ReadinessStatus = 'pass'|'action'|'manual';
export type ReadinessCheck = {key:string;label:string;status:ReadinessStatus;detail:string};
export type ReadinessIsolation = {status:'pass'|'failed'|'unavailable';checkedTables?:number};
export function assessBusinessReadiness(record:Record<string,unknown>,isolation:ReadinessIsolation):{
  checks:ReadinessCheck[];requiredActions:number;optionalChecks:number;readyForManualReview:boolean
};
