import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { skipToken } from "@tanstack/react-query";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import {
  AREA_META,
  AREAS_BY_REGION,
  BAND_META,
  CATEGORIES_BY_GROUP,
  CATEGORY_META,
  DEFAULT_AREA,
  SCAN_MAX_RESULTS,
  isCategory,
  scoreBand,
  type AreaName,
  type BusinessScanResult,
  type CategoryName,
  type CompetitorInfo,
  type Tone,
} from "@contracts/grid";
import { fmtCompactKes, scoreColor } from "@/lib/format";
import {
  FREE_GAPS,
  downloadCsv,
  fixValueKes,
  sortOpportunities,
  toCsv,
  type SortMode,
} from "@/lib/opportunity";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { ScoutMap } from "@/components/ScoutMap";
import { AuditPanel } from "@/components/AuditPanel";
import { RadarToggle } from "@/components/RadarToggle";
import { StkModal } from "@/components/StkModal";

type CategoryFilter = CategoryName | "all";
type ScanParams = { area: AreaName; category: CategoryFilter };

const TONE_DOT: Record<Tone, string> = {
  red: "bg-scout-red",
  amber: "bg-scout-amber",
  mint: "bg-scout-mint",
  primary: "bg-primary",
  neutral: "bg-muted-foreground",
};

const DEFAULT_CATEGORY: CategoryFilter = "dentist";
const PAGE = 6;
const NO_COMPETITORS: CompetitorInfo[] = [];

const SORT_OPTIONS: ReadonlyArray<readonly [SortMode, string]> = [
  ["leak", "Biggest leak"],
  ["quickwin", "Quick wins"],
];

export default function Dashboard() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  // Admin guard: the checkout flow is a no-op for admins at every layer.
  const isAdmin = user?.role === "admin";

  const [area, setArea] = useState<AreaName>(DEFAULT_AREA);
  const [category, setCategory] = useState<CategoryFilter>(DEFAULT_CATEGORY);
  const [showHeat, setShowHeat] = useState(true);
  const [showRings, setShowRings] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sweepKey, setSweepKey] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>("leak");
  const [minLeak, setMinLeak] = useState(0);
  const [scanParams, setScanParams] = useState<ScanParams | null>({
    area: DEFAULT_AREA,
    category: DEFAULT_CATEGORY,
  });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const detailRef = useRef<HTMLElement>(null);
  const utils = trpc.useUtils();

  const { data: areas } = trpc.grid.areas.useQuery();
  const counts = useMemo(
    () => new Map<AreaName, number>(areas?.map((a) => [a.name, a.businesses])),
    [areas],
  );

  const scan = trpc.grid.scan.useQuery(
    scanParams
      ? {
          area: scanParams.area,
          ...(scanParams.category !== "all" ? { category: scanParams.category } : {}),
        }
      : skipToken,
  );

  const audit = trpc.grid.audit.useQuery(
    selectedId !== null ? { businessId: selectedId } : skipToken,
  );

  const results = useMemo(
    () =>
      sortOpportunities(
        (scan.data ?? []).filter((r) => r.lostRevenueKes >= minLeak),
        sortMode,
      ),
    [scan.data, minLeak, sortMode],
  );

  const capped = (scan.data?.length ?? 0) >= SCAN_MAX_RESULTS;

  const stats = useMemo(
    () => ({
      invisible: results.filter((r) => scoreBand(r.scores.visibility) === "invisible").length,
      leak: results.reduce((s, r) => s + r.lostRevenueKes, 0),
      gaps: results.reduce((s, r) => s + r.issues.length, 0),
      fixValue: results.reduce((s, r) => s + fixValueKes(r.scores.visibility), 0),
    }),
    [results],
  );

  const isStale =
    scanParams !== null && (scanParams.area !== area || scanParams.category !== category);

  const runScan = () => {
    setScanParams({ area, category });
    setSelectedId(null);
    setShowAll(false);
    setSweepKey((k) => k + 1);
  };

  const handleExport = () => {
    const csv = toCsv(results, (c) => (isCategory(c) ? CATEGORY_META[c].label : c));
    downloadCsv(`gridscout-${scanParams?.area ?? area}.csv`.toLowerCase().replace(/\s+/g, "-"), csv);
  };

  // Admins never need the checkout; every child calls this single callback.
  const handleBuyCredits = useCallback(() => {
    if (isAdmin) return;
    setCheckoutOpen(true);
  }, [isAdmin]);

  useEffect(() => {
    if (selectedId === null || checkoutOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelectedId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, checkoutOpen]);

  useEffect(() => {
    if (selectedId === null) return;
    if (window.matchMedia("(max-width: 1023px)").matches) {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedId]);

  const { center: areaCenter, zoom: areaZoom } = AREA_META[area];
  const auditMissing = !audit.isLoading && (audit.isError || audit.data === null);

  return (
    <div className="scanlines relative flex min-h-dvh flex-col bg-background">
      <ConsoleHeader onBuyCredits={handleBuyCredits} />

      <main className="grid flex-1 grid-cols-1 lg:grid-cols-[270px_1fr_370px]">
        {/* LEFT: scan console */}
        <aside className="order-2 border-b border-border p-4 lg:order-1 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="tech-label tech-label--live mb-4">Scan console</div>

          <div className="mb-4" role="group" aria-label="Sector">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Sector
            </div>
            <div className="space-y-3">
              {AREAS_BY_REGION.map((g) => (
                <div key={g.region}>
                  <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground/60">
                    {g.label}
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {g.areas.map((a) => (
                      <button
                        key={a}
                        onClick={() => setArea(a)}
                        aria-pressed={area === a}
                        className={`flex cursor-pointer items-center justify-between border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                          area === a
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                        }`}
                      >
                        {a}
                        <span className="text-[10px] opacity-60">{counts.get(a) ?? "—"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="target-class"
              className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
            >
              Target class
            </label>
            <select
              id="target-class"
              value={category}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "all" || isCategory(v)) setCategory(v);
              }}
              className="w-full cursor-pointer border border-border bg-secondary px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All categories</option>
              {CATEGORIES_BY_GROUP.map((g) => (
                <optgroup key={g.group} label={g.label}>
                  {g.categories.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_META[c].label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <button
            onClick={runScan}
            disabled={scan.isFetching}
            className="group relative mb-2 flex w-full cursor-pointer items-center justify-center gap-3 overflow-hidden border border-primary bg-primary/15 py-3.5 font-display text-sm font-bold uppercase tracking-[0.3em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
          >
            <span className="radar-sweep absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20" />
            {scan.isFetching ? "Scanning…" : isStale || !scanParams ? "Initiate scan" : "Re-scan"}
          </button>
          <p
            className="mb-5 min-h-4 font-mono text-[10px] uppercase tracking-[0.16em] text-scout-amber"
            aria-live="polite"
          >
            {isStale ? "Settings changed. Results are outdated" : null}
          </p>

          <div className="hairline-t pt-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Rank by
            </div>
            <div className="grid grid-cols-2 gap-1" role="group" aria-label="Rank by">
              {SORT_OPTIONS.map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setSortMode(v)}
                  aria-pressed={sortMode === v}
                  className={`cursor-pointer border px-2 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                    sortMode === v
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <label className="mt-3 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Min leak: {minLeak === 0 ? "any" : `${fmtCompactKes(minLeak)}/mo`}
              <input
                type="range"
                min={0}
                max={200000}
                step={10000}
                value={minLeak}
                onChange={(e) => {
                  setMinLeak(Number(e.target.value));
                  setShowAll(false);
                }}
                className="mt-1 w-full accent-[hsl(var(--primary))]"
              />
            </label>
          </div>

          <div className="hairline-t mt-4 pt-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Overlays
            </div>
            <RadarToggle checked={showHeat} onChange={setShowHeat} label="Demand heatmap" hint="revenue leak intensity" />
            <RadarToggle checked={showRings} onChange={setShowRings} label="Competitor rings" hint="radius around selection" />
          </div>

          <div className="hairline-t mt-4 space-y-1.5 pt-4 font-mono text-[10px] uppercase tracking-[0.16em]">
            {(["invisible", "weak", "strong"] as const).map((b) => (
              <LegendRow
                key={b}
                dot={TONE_DOT[BAND_META[b].tone]}
                label={`${BAND_META[b].label} ${BAND_META[b].range}`}
              />
            ))}
          </div>

          {scanParams && !scan.isError && (
            <div
              className="hairline-t mt-4 space-y-1 pt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
              aria-live="polite"
            >
              <StatRow label="Contacts" value={`${results.length}${capped && minLeak === 0 ? "+" : ""}`} />
              <StatRow label="Invisible" value={stats.invisible} tone="text-scout-red" />
              <StatRow label="Gaps found" value={stats.gaps} tone="text-scout-amber" />
              <StatRow label="Combined leak" value={`${fmtCompactKes(stats.leak)}/mo`} tone="text-scout-red" />
              <StatRow label="Fix pipeline" value={fmtCompactKes(stats.fixValue)} tone="text-scout-mint" />
              {capped && (
                <p className="pt-1 text-[9px] normal-case tracking-normal opacity-70">
                  Showing top {SCAN_MAX_RESULTS} by revenue at risk. Filter by category to see the rest.
                </p>
              )}
              <p className="pt-1 text-[9px] normal-case tracking-normal opacity-70">
                Fix pipeline is an estimate of what you could sell, based on standard fix packages.
              </p>
            </div>
          )}
        </aside>

        {/* CENTER: map */}
        <section className="relative order-1 h-[52vh] lg:order-2 lg:h-auto lg:min-h-[calc(100dvh-14rem)]">
          <ScoutMap
            results={results}
            selectedId={selectedId}
            competitors={audit.data?.competitors ?? NO_COMPETITORS}
            center={areaCenter}
            zoom={areaZoom}
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

        {/* RIGHT: audit / priority targets */}
        <aside
          ref={detailRef}
          className="hairline-t order-3 min-h-[420px] border-border lg:border-l lg:border-t-0"
        >
          {selectedId !== null ? (
            <div className="flex h-full flex-col">
              <button
                onClick={() => setSelectedId(null)}
                className="hairline-b flex cursor-pointer items-center gap-2 px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
              >
                ← Back to targets <span className="opacity-50">(esc)</span>
              </button>
              <div className="min-h-0 flex-1">
                {auditMissing ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-scout-red">
                      {audit.isError ? "Audit failed to load" : "Business not found"}
                    </p>
                    {audit.isError && (
                      <button
                        onClick={() => audit.refetch()}
                        className="cursor-pointer border border-primary px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                ) : (
                  <AuditPanel
                    audit={audit.data}
                    loading={audit.isLoading}
                    onBuyCredits={handleBuyCredits}
                    onUnlocked={() => {
                      utils.grid.audit.invalidate();
                      utils.leads.list.invalidate();
                      utils.payments.wallet.invalidate();
                    }}
                  />
                )}
              </div>
            </div>
          ) : (
            <PriorityTargets
              results={results}
              scanned={scanParams !== null}
              loading={scan.isFetching}
              error={scan.isError}
              showAll={showAll}
              sortMode={sortMode}
              filtered={minLeak > 0}
              onToggleAll={() => setShowAll((v) => !v)}
              onRetry={() => scan.refetch()}
              onSelect={setSelectedId}
              onExport={handleExport}
              onClearFilter={() => setMinLeak(0)}
            />
          )}
        </aside>
      </main>

      {/* Admins never render the checkout modal at all. */}
      {!isAdmin && <StkModal open={checkoutOpen} onOpenChange={setCheckoutOpen} />}
    </div>
  );
}

function LegendRow({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} /> {label}
    </div>
  );
}

function StatRow({
  label,
  value,
  tone = "text-foreground",
}: {
  label: string;
  value: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className={tone}>{value}</span>
    </div>
  );
}

function PriorityTargets({
  results,
  scanned,
  loading,
  error,
  showAll,
  sortMode,
  filtered,
  onToggleAll,
  onRetry,
  onSelect,
  onExport,
  onClearFilter,
}: {
  results: BusinessScanResult[];
  scanned: boolean;
  loading: boolean;
  error: boolean;
  showAll: boolean;
  sortMode: SortMode;
  filtered: boolean;
  onToggleAll: () => void;
  onRetry: () => void;
  onSelect: (id: number) => void;
  onExport: () => void;
  onClearFilter: () => void;
}) {
  if (loading) {
    return (
      <div className="p-4" aria-busy="true">
        <div className="tech-label tech-label--live mb-4">Intercepting signals…</div>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse bg-secondary/50" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-scout-red">Signal lost</p>
        <button
          onClick={onRetry}
          className="cursor-pointer border border-primary px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary hover:bg-primary hover:text-primary-foreground"
        >
          Retry scan
        </button>
      </div>
    );
  }

  if (!scanned) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="radar-sweep h-16 w-16 rounded-full border border-border" />
        <p className="font-mono text-[11px] uppercase leading-relaxed tracking-[0.2em] text-muted-foreground">
          Awaiting scan command
          <br />
          highest-value targets will surface here
        </p>
      </div>
    );
  }

  const visible = showAll ? results : results.slice(0, PAGE);

  return (
    <div className="flex h-full flex-col">
      <div className="hairline-b p-4">
        <div className="tech-label tech-label--live">Priority targets</div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {sortMode === "quickwin" ? "Ranked by easiest win first" : "Ranked by monthly revenue at risk"}
        </p>
        <p className="mt-1 font-mono text-[9px] normal-case tracking-wide text-muted-foreground/70">
          Top {FREE_GAPS} gaps are free. Unlock a lead for the full list, fix plan and contact.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {visible.map((r, i) => {
          const fix = fixValueKes(r.scores.visibility);
          const hidden = Math.max(0, r.issues.length - FREE_GAPS);
          return (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className="group flex w-full cursor-pointer items-center gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors hover:bg-secondary/50 focus-visible:bg-secondary/50 focus-visible:outline-none"
            >
              <span className="font-mono text-[10px] text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground group-hover:text-primary">
                  {r.name}
                </span>
                <span className="block truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {CATEGORY_META[r.category].label} · {r.issues[0] ?? "no major gaps"}
                </span>
                {r.issues.length > 0 && (
                  <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-wider text-scout-amber">
                    {r.issues.length} gap{r.issues.length === 1 ? "" : "s"}
                    {hidden > 0 ? ` · ${hidden} hidden` : ""}
                  </span>
                )}
              </span>
              <span className="text-right">
                <span className="block font-display text-sm font-bold text-scout-red">
                  {fmtCompactKes(r.lostRevenueKes)}
                </span>
                <span className="block font-mono text-[10px]" style={{ color: scoreColor(r.scores.visibility) }}>
                  VIS {r.scores.visibility}
                </span>
                {fix > 0 && (
                  <span className="block font-mono text-[9px] uppercase tracking-wider text-scout-mint">
                    fix {fmtCompactKes(fix)}
                  </span>
                )}
              </span>
            </button>
          );
        })}

        {results.length > PAGE && (
          <button
            onClick={onToggleAll}
            className="w-full cursor-pointer py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
          >
            {showAll ? `Show top ${PAGE}` : `Show all ${results.length}`}
          </button>
        )}

        {results.length > 0 && (
          <button
            onClick={onExport}
            className="hairline-t w-full cursor-pointer py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
          >
            Export list (CSV)
          </button>
        )}

        {results.length === 0 && (
          <div className="space-y-3 p-6 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            <p>
              {filtered
                ? "No targets above your minimum leak."
                : 'No signals in this sector. Try another sector or "All categories".'}
            </p>
            {filtered && (
              <button
                onClick={onClearFilter}
                className="cursor-pointer border border-primary px-4 py-2 text-primary hover:bg-primary hover:text-primary-foreground"
              >
                Clear filter
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}