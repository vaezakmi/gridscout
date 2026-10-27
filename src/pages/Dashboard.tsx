import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import {
  AREA_LIST,
  CATEGORY_LIST,
  CATEGORY_META,
  type CategoryName,
  type BusinessScanResult,
} from "@contracts/grid";
import { fmtCompactKes, scoreColor } from "@/lib/format";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { ScoutMap } from "@/components/ScoutMap";
import { AuditPanel } from "@/components/AuditPanel";
import { RadarToggle } from "@/components/RadarToggle";
import { StkModal } from "@/components/StkModal";

type CategoryFilter = CategoryName | "all";

export default function Dashboard() {
  useAuth({ redirectOnUnauthenticated: true });

  const [area, setArea] = useState<string>("Westlands");
  const [category, setCategory] = useState<CategoryFilter>("dentist");
  const [showHeat, setShowHeat] = useState(true);
  const [showRings, setShowRings] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sweepKey, setSweepKey] = useState(0);
  const [scanParams, setScanParams] = useState<{ area: string; category: CategoryFilter } | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: areas } = trpc.grid.areas.useQuery();
  const scanInput = useMemo(
    () =>
      scanParams
        ? {
            area: scanParams.area,
            ...(scanParams.category !== "all"
              ? { category: scanParams.category as CategoryName }
              : {}),
          }
        : { area: "___none___" as string },
    [scanParams]
  );
  const scan = trpc.grid.scan.useQuery(scanInput, { enabled: scanParams !== null });
  const results = scan.data ?? [];

  const audit = trpc.grid.audit.useQuery(
    { businessId: selectedId ?? 0 },
    { enabled: selectedId !== null }
  );

  const runScan = () => {
    setScanParams({ area, category });
    setSelectedId(null);
    setSweepKey((k) => k + 1);
  };

  const areaCenter = areas?.find((a) => a.name === area)?.center ?? { lat: -1.2635, lng: 36.8023 };
  const invisibleCount = results.filter((r) => r.scores.visibility < 40).length;
  const totalLeak = results.reduce((s, r) => s + r.lostRevenueKes, 0);
  const selectedCompetitors = audit.data?.competitors ?? [];

  return (
    <div className="scanlines relative flex min-h-dvh flex-col bg-background">
      <ConsoleHeader onBuyCredits={() => setCheckoutOpen(true)} />

      <main className="grid flex-1 grid-cols-1 lg:grid-cols-[270px_1fr_370px]">
        {/* LEFT — scan console */}
        <aside className="order-2 border-b border-border p-4 lg:order-1 lg:border-b-0 lg:border-r">
          <div className="tech-label tech-label--live mb-4">Scan console</div>

          <div className="mb-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Sector
            </div>
            <div className="grid grid-cols-1 gap-1">
              {AREA_LIST.map((a) => (
                <button
                  key={a}
                  onClick={() => setArea(a)}
                  className={`flex cursor-pointer items-center justify-between border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
                    area === a
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {a}
                  <span className="text-[10px] opacity-60">
                    {areas?.find((x) => x.name === a)?.businesses ?? "—"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Target class
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryFilter)}
              className="w-full cursor-pointer border border-border bg-secondary px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All categories</option>
              {CATEGORY_LIST.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_META[c].label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={runScan}
            disabled={scan.isFetching}
            className="group relative mb-5 flex w-full cursor-pointer items-center justify-center gap-3 overflow-hidden border border-primary bg-primary/15 py-3.5 font-display text-sm font-bold uppercase tracking-[0.3em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
          >
            <span className="radar-sweep absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20" />
            {scan.isFetching ? "Scanning…" : "Initiate scan"}
          </button>

          <div className="hairline-t pt-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Overlays
            </div>
            <RadarToggle checked={showHeat} onChange={setShowHeat} label="Demand heatmap" hint="revenue leak intensity" />
            <RadarToggle checked={showRings} onChange={setShowRings} label="Competitor rings" hint="radius around selection" />
          </div>

          <div className="hairline-t mt-4 space-y-1.5 pt-4 font-mono text-[10px] uppercase tracking-[0.16em]">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-scout-red" /> invisible &lt;35
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-scout-amber" /> weak 35–64
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-scout-mint" /> strong 65+
            </div>
          </div>

          {scanParams && (
            <div className="hairline-t mt-4 space-y-1 pt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <div className="flex justify-between">
                <span>Contacts</span>
                <span className="text-foreground">{results.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Invisible</span>
                <span className="text-scout-red">{invisibleCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Combined leak</span>
                <span className="text-scout-red">{fmtCompactKes(totalLeak)}/mo</span>
              </div>
            </div>
          )}
        </aside>

        {/* CENTER — map */}
        <section className="relative order-1 h-[52vh] lg:order-2 lg:h-auto lg:min-h-[calc(100dvh-14rem)]">
          <ScoutMap
            results={results}
            selectedId={selectedId}
            competitors={selectedCompetitors}
            center={areaCenter}
            showHeat={showHeat}
            showRings={showRings}
            sweepKey={sweepKey}
            onSelect={setSelectedId}
          />
          {!scanParams && (
            <div className="pointer-events-none absolute inset-x-0 bottom-6 z-[500] flex justify-center">
              <div className="tech-label bg-card/90">Configure sector + target class, then initiate scan</div>
            </div>
          )}
        </section>

        {/* RIGHT — audit / priority targets */}
        <aside className="hairline-t order-3 min-h-[420px] border-border lg:border-l lg:border-t-0">
          {selectedId !== null ? (
            <AuditPanel
              audit={audit.data}
              loading={audit.isLoading}
              onBuyCredits={() => setCheckoutOpen(true)}
              onUnlocked={() => {
                utils.grid.audit.invalidate();
                utils.leads.list.invalidate();
                utils.payments.wallet.invalidate();
              }}
            />
          ) : (
            <PriorityTargets results={results} scanned={scanParams !== null} onSelect={setSelectedId} loading={scan.isFetching} />
          )}
        </aside>
      </main>

      <StkModal open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </div>
  );
}

function PriorityTargets({
  results,
  scanned,
  onSelect,
  loading,
}: {
  results: BusinessScanResult[];
  scanned: boolean;
  onSelect: (id: number) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="p-4">
        <div className="tech-label tech-label--live mb-4">Intercepting signals…</div>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse bg-secondary/50" />
          ))}
        </div>
      </div>
    );
  }
  if (!scanned) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="radar-sweep h-16 w-16 rounded-full border border-border" />
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] leading-relaxed text-muted-foreground">
          Awaiting scan command
          <br />
          highest-value targets will surface here
        </p>
      </div>
    );
  }
  const top = results.slice(0, 6);
  return (
    <div className="flex h-full flex-col">
      <div className="hairline-b p-4">
        <div className="tech-label tech-label--live">Priority targets</div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Ranked by monthly revenue at risk
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {top.map((r, i) => (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className="group flex w-full cursor-pointer items-center gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors hover:bg-secondary/50"
          >
            <span className="font-mono text-[10px] text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground group-hover:text-primary">
                {r.name}
              </span>
              <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {CATEGORY_META[r.category].label} · {r.issues[0] ?? "no major leaks"}
              </span>
            </span>
            <span className="text-right">
              <span className="block font-display text-sm font-bold text-scout-red">
                {fmtCompactKes(r.lostRevenueKes)}
              </span>
              <span className="block font-mono text-[10px]" style={{ color: scoreColor(r.scores.visibility) }}>
                VIS {r.scores.visibility}
              </span>
            </span>
          </button>
        ))}
        {top.length === 0 && (
          <div className="p-6 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            No signals in this sector
          </div>
        )}
      </div>
    </div>
  );
}
