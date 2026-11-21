export const calcFinancial = (txns: {amountKes:number}[]) => {
  if(txns.length < 10) return 35;
  const a = txns.map(t=>t.amountKes), mean = a.reduce((x,y)=>x+y,0)/a.length;
  const std = Math.sqrt(a.reduce((s,v)=>s+Math.pow(v-mean,2),0)/a.length);
  return Math.max(10, Math.min(100, Math.round(100 - (std/mean)*60)));
}
export const calcResponsiveness = (logs: {status:string}[]) => {
  if(!logs.length) return 50;
  return Math.round(logs.filter(l=>l.status!=="missed").length/logs.length*100);
}
export function computeGridTrust(vis:number, resp:number, fin:number) {
  const total = Math.round(vis*4.5 + resp*3.0 + fin*2.5);
  return { total, band: (total>700?"Prime":total>450?"Stable":"Risky") as "Risky"|"Stable"|"Prime", visibility:vis, responsiveness:resp, financial:fin };
}
