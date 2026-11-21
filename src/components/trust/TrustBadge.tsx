export function TrustBadge({ total, band }: { total: number; band: "Risky"|"Stable"|"Prime" }) {
  const color = band==="Prime" ? "bg-emerald-500" : band==="Stable" ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${color}`}>{total}</div>
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Grid Trust</div>
        <div className="font-mono font-bold">{band} • {total}/1000</div>
      </div>
    </div>
  );
}
