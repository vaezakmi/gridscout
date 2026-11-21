import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  sortOpportunities,
  toCsv,
  type SortMode,
} from "@/lib/opportunity";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { ScoutMap } from "@/components/ScoutMap";
import { AuditPanel } from "@/components/AuditPanel";
import { RadarToggle } from "@/components/RadarToggle";
import { StkModal } from "@/components/StkModal";
import { Link } from "react-router";

type CategoryFilter = CategoryName | "all";
type ScanParams = { area: AreaName; category: CategoryFilter };

interface ScanStats {
  invisible: number;
  leak: number;
  revenueAssessed: number;
  gaps: number;
}

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
const MOBILE_QUERY = "(max-width: 1023px)";
const MAX_MIN_LEAK = 200_000;
const LEAK_STEP = 10_000;

const SORT_OPTIONS: ReadonlyArray<readonly [SortMode, string]> = [
  ["leak", "Biggest leak"],
  ["quickwin", "Quick wins"],
];

// Shared chip/toggle styles for the console
const CHIP_ON = "border-primary/60 bg-primary/10 text-primary";
const CHIP_OFF = "border-transparent text-muted-foreground hover:border-border hover:text-foreground";
const CHIP_FOCUS = "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary";
const RETRY_BTN =
  "cursor-pointer border border-primary px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary hover:bg-primary hover:text-primary-foreground";

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
        (scan.data ?? []).filter((r) =>
          r.lostRevenueKes === null ? minLeak === 0 : r.lostRevenueKes >= minLeak,
        ),
        sortMode,
      ),
    [scan.data, minLeak, sortMode],
  );

  const capped = (scan.data?.length ?? 0) >= SCAN_MAX_RESULTS;

  // Single pass over results instead of three.
  const stats = useMemo<ScanStats>(() => {
    let invisible = 0;
    let leak = 0;
    let revenueAssessed = 0;
    let gaps = 0;
    for (const r of results) {
      if (r.scores.visibility !== null && scoreBand(r.scores.visibility) === "invisible") invisible++;
      if (r.lostRevenueKes !== null) {
        leak += r.lostRevenueKes;
        revenueAssessed++;
      }
      gaps += r.issues.length;
    }
    return { invisible, leak, revenueAssessed, gaps };
  }, [results]);

  const isStale =
    scanParams !== null && (scanParams.area !== area || scanParams.category !== category);

  const runScan = useCallback(() => {
    setScanParams({ area, category });
    setSelectedId(null);
    setShowAll(false);
    setSweepKey((k) => k + 1);
  }, [area, category]);

  const handleExport = useCallback(() => {
    const csv = toCsv(results, (c) => (isCategory(c) ? CATEGORY_META[c].label : c));
    downloadCsv(`gridscout-${scanParams?.area ?? area}.csv`.toLowerCase().replace(/\s+/g, "-"), csv);
  }, [results, scanParams, area]);

  // Admins never need the checkout; every child calls this single callback.
  const handleBuyCredits = useCallback(() => {
    if (isAdmin) return;
    setCheckoutOpen(true);
  }, [isAdmin]);

  const handleUnlocked = useCallback(() => {
    void utils.grid.audit.invalidate();
    void utils.leads.list.invalidate();
    void utils.payments.wallet.invalidate();
  }, [utils]);

  const handleSelectCategory = useCallback((v: string) => {
    if (v === "all" || isCategory(v)) setCategory(v);
  }, []);

  // Changing the filter collapses "show all" so the list never silently hides rows.
  const handleMinLeak = useCallback((n: number) => {
    setMinLeak(n);
    setShowAll(false);
  }, []);

  useEffect(() => {
    if (selectedId === null || checkoutOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelectedId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, checkoutOpen]);

  useEffect(() => {
    if (selectedId === null) return;
    if (window.matchMedia(MOBILE_QUERY).matches) {
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
        <ScanConsole
          area={area}
          category={category}
          sortMode={sortMode}
          minLeak={minLeak}
          showHeat={showHeat}
          showRings={showRings}
          counts={counts}
          scanning={scan.isFetching}
          stale={isStale}
          hasScanned={scanParams !== null}
          scanError={scan.isError}
          stats={stats}
          resultCount={results.length}
          capped={capped}
          onSelectArea={setArea}
          onSelectCategory={handleSelectCategory}
          onSortMode={setSortMode}
          onMinLeak={handleMinLeak}
          onToggleHeat={setShowHeat}
          onToggleRings={setShowRings}
          onRunScan={runScan}
        />

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
          {scanParams === null && (
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
        {isAdmin && (
  <section className="hairline-b border-border bg-card/40 p-4">
    <div className="mb-3 flex items-center justify-between">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-scout-mint">
          Administrator
        </div>
        <h3 className="mt-1 font-display text-sm font-bold uppercase tracking-wider">
          Admin Operations
        </h3>
      </div>
      <span className="h-2 w-2 rotate-45 bg-scout-mint" />
    </div>

    <div className="grid grid-cols-2 gap-2">
      <Link
        to="/admin/fixes"
        className="group border border-border bg-secondary/40 p-3 transition-colors hover:border-primary/50 hover:bg-primary/5"
      >
        <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">
          01 / Workflow
        </div>
        <div className="font-display text-sm font-bold">Service Desk</div>
        <div className="mt-1 font-mono text-[9px] text-muted-foreground">
          Manage service requests
        </div>
      </Link>

      <Link
        to="/admin/osm"
        className="group border border-border bg-secondary/40 p-3 transition-colors hover:border-primary/50 hover:bg-primary/5"
      >
        <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">
          02 / Discovery
        </div>
        <div className="font-display text-sm font-bold">OSM Preview</div>
        <div className="mt-1 font-mono text-[9px] text-muted-foreground">
          Inspect discovery results
        </div>
      </Link>
    </div>

    <p className="mt-3 font-mono text-[9px] leading-relaxed text-muted-foreground">
      Internal administration tools. OSM preview availability is still subject
      to discovery-provider health.
    </p>
  </section>
)}  
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
                      <button onClick={() => void audit.refetch()} className={RETRY_BTN}>
                        Retry
                      </button>
                    )}
                  </div>
                ) : (
                  <AuditPanel
                    audit={audit.data}
                    loading={audit.isLoading}
                    onBuyCredits={handleBuyCredits}
                    onUnlocked={handleUnlocked}
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
              onRetry={() => void scan.refetch()}
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

/* ------------------------------------------------------------------ */
/* Left rail: scan console                                             */
/* ------------------------------------------------------------------ */

function ScanConsole({
  area,
  category,
  sortMode,
  minLeak,
  showHeat,
  showRings,
  counts,
  scanning,
  stale,
  hasScanned,
  scanError,
  stats,
  resultCount,
  capped,
  onSelectArea,
  onSelectCategory,
  onSortMode,
  onMinLeak,
  onToggleHeat,
  onToggleRings,
  onRunScan,
}: {
  area: AreaName;
  category: CategoryFilter;
  sortMode: SortMode;
  minLeak: number;
  showHeat: boolean;
  showRings: boolean;
  counts: Map<AreaName, number>;
  scanning: boolean;
  stale: boolean;
  hasScanned: boolean;
  scanError: boolean;
  stats: ScanStats;
  resultCount: number;
  capped: boolean;
  onSelectArea: (a: AreaName) => void;
  onSelectCategory: (v: string) => void;
  onSortMode: (m: SortMode) => void;
  onMinLeak: (n: number) => void;
  onToggleHeat: (v: boolean) => void;
  onToggleRings: (v: boolean) => void;
  onRunScan: () => void;
}) {
  return (
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
                    onClick={() => onSelectArea(a)}
                    aria-pressed={area === a}
                    className={`flex cursor-pointer items-center justify-between border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${CHIP_FOCUS} ${
                      area === a ? CHIP_ON : CHIP_OFF
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
          onChange={(e) => onSelectCategory(e.target.value)}
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
        onClick={onRunScan}
        disabled={scanning}
        className="group relative mb-2 flex w-full cursor-pointer items-center justify-center gap-3 overflow-hidden border border-primary bg-primary/15 py-3.5 font-display text-sm font-bold uppercase tracking-[0.3em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
      >
        <span className="radar-sweep absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20" />
        {scanning ? "Scanning…" : stale || !hasScanned ? "Initiate scan" : "Re-scan"}
      </button>
      <p
        className="mb-5 min-h-4 font-mono text-[10px] uppercase tracking-[0.16em] text-scout-amber"
        aria-live="polite"
      >
        {stale ? "Settings changed. Results are outdated" : null}
      </p>

      <div className="hairline-t pt-4">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Rank by
        </div>
        <div className="grid grid-cols-2 gap-1" role="group" aria-label="Rank by">
          {SORT_OPTIONS.map(([v, l]) => (
            <button
              key={v}
              onClick={() => onSortMode(v)}
              aria-pressed={sortMode === v}
              className={`cursor-pointer border px-2 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${CHIP_FOCUS} ${
                sortMode === v ? CHIP_ON : CHIP_OFF
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
            max={MAX_MIN_LEAK}
            step={LEAK_STEP}
            value={minLeak}
            onChange={(e) => onMinLeak(Number(e.target.value))}
            className="mt-1 w-full accent-[hsl(var(--primary))]"
          />
        </label>
      </div>

      <div className="hairline-t mt-4 pt-4">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Overlays
        </div>
        <RadarToggle checked={showHeat} onChange={onToggleHeat} label="Demand heatmap" hint="revenue leak intensity" />
        <RadarToggle checked={showRings} onChange={onToggleRings} label="Competitor rings" hint="radius around selection" />
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

      {hasScanned && !scanError && (
        <div
          className="hairline-t mt-4 space-y-1 pt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
          aria-live="polite"
        >
          <StatRow label="Contacts" value={`${resultCount}${capped && minLeak === 0 ? "+" : ""}`} />
          <StatRow label="Invisible" value={stats.invisible} tone="text-scout-red" />
          <StatRow label="Gaps found" value={stats.gaps} tone="text-scout-amber" />
          <StatRow
            label="Assessed combined leak"
            value={stats.revenueAssessed === 0 ? "Not estimated" : `${fmtCompactKes(stats.leak)}/mo`}
            tone="text-scout-red"
          />
          {capped && (
            <p className="pt-1 text-[9px] normal-case tracking-normal opacity-70">
              Showing top {SCAN_MAX_RESULTS} by revenue at risk. Filter by category to see the rest.
            </p>
          )}
        </div>
      )}
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Right rail: priority targets                                        */
/* ------------------------------------------------------------------ */

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
        <button onClick={onRetry} className={RETRY_BTN}>
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
        {visible.map((r, i) => (
          <TargetRow key={r.id} result={r} index={i} onSelect={onSelect} />
        ))}

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
              <button onClick={onClearFilter} className={RETRY_BTN}>
                Clear filter
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TargetRow({
  result,
  index,
  onSelect,
}: {
  result: BusinessScanResult;
  index: number;
  onSelect: (id: number) => void;
}) {
  const hidden = Math.max(0, result.issues.length - FREE_GAPS);
  return (
    <button
      onClick={() => onSelect(result.id)}
      className="group flex w-full cursor-pointer items-center gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors hover:bg-secondary/50 focus-visible:bg-secondary/50 focus-visible:outline-none"
    >
      <span className="font-mono text-[10px] text-muted-foreground">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground group-hover:text-primary">
          {result.name}
        </span>
        <span className="block truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {CATEGORY_META[result.category].label} · {result.issues[0] ?? "no major gaps"}
        </span>
        {result.issues.length > 0 && (
          <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-wider text-scout-amber">
            {result.issues.length} gap{result.issues.length === 1 ? "" : "s"}
            {hidden > 0 ? ` · ${hidden} hidden` : ""}
          </span>
        )}
      </span>
      <span className="text-right">
        <span className="block font-display text-sm font-bold text-scout-red">
          {result.lostRevenueKes === null ? "Not estimated" : fmtCompactKes(result.lostRevenueKes)}
        </span>
        <span className="block font-mono text-[10px]" style={{ color: scoreColor(result.scores.visibility) }}>
          VIS {result.scores.visibility ?? "Not assessed"}
        </span>
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Small primitives                                                    */
/* ------------------------------------------------------------------ */

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
  value: ReactNode;
  tone?: string;
}) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className={tone}>{value}</span>
    </div>
  );
}