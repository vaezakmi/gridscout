export function parseMpesaSms(raw: string) {
  const m = raw.match(/Ksh\s?([\d,]+\.\d{2}).*?(paid to|sent to)\s(.+?)\s+on/i);
  if(!m) return null;
  return {
    amount: parseFloat(m[1].replace(/,/g,"")),
    type: m[2].toLowerCase().includes("paid") ? "payin" as const : "payout" as const,
    counterparty: m[3]?.trim(),
    date: new Date()
  };
}
