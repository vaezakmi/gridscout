export async function pushStk(phone:string, amount:number, ref:string){
  console.log(`STK KES ${amount} -> ${phone} ${ref}`);
  return { CheckoutRequestID: `ws_${Date.now()}`, ResponseCode:"0" };
}
