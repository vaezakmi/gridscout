import { trpc } from "@/providers/trpc";
import { fmtCompactKes } from "@/lib/format";

export function Ticker() {
  const { data } = trpc.grid.stats.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const items = data
    ? [
        `${data.businessesIndexed} businesses indexed across Nairobi & Nakuru`,
        `${data.invisibleCount} currently invisible on local search`,
        `${fmtCompactKes(data.totalLostRevenueKes)} in monthly revenue leaking to competitors`,
        `average visibility score ${data.avgVisibility}/100`,
        "M-Pesa STK checkout live — demo mode",
        "AI pitch engine online",
      ]
    : ["establishing uplink…"];

  const row = (key: string) => (
    <div key={key} className="flex shrink-0 items-center">
      {items.map((t, i) => (
        <span key={i} className="flex items-center whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className="mx-4 text-primary">◆</span>
          {t}
        </span>
      ))}
    </div>
  );

  return (
    <div className="hairline-b hairline-t relative flex h-8 items-center overflow-hidden bg-card/60" aria-hidden="true">
      <div className="ticker-track flex">
        {row("a")}
        {row("b")}
      </div>
    </div>
  );
}
