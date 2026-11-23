
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type CategoryFilter = CategoryName | "all";
type ScanParams = { area: AreaName; category: CategoryFilter };

interface ScanStats {
  invisible: number;
  leak: number;
  revenueAssessed: number;
  gaps: number;
}

/**
 * Structural type for one service request row.
 * Client details are returned by the admin query.
 */
interface ServiceRequestRow {
  id: number;
  status: string;
  createdAt: string | Date;
  packages?: string[] | null;
  totalKes: number;
  quotedKes?: number | null;
  note?: string | null;
  adminNote?: string | null;
  business?: { name?: string | null } | null;
  client?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}

type DeskTab = "mine" | "clients";
type StatusFilter = "all" | "active" | "delivered" | "closed";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

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

const AREAS_STALE_MS = 5 * 60_000;
const SCAN_STALE_MS = 30_000;
const AUDIT_STALE_MS = 60_000;

const SORT_OPTIONS: ReadonlyArray<readonly [SortMode, string]> = [
  ["leak", "Biggest leak"],
  ["quickwin", "Quick wins"],
];

const CHIP_ON = "border-primary/60 bg-primary/10 text-primary";
const CHIP_OFF =
  "border-transparent text-muted-foreground hover:border-border hover:text-foreground";
const CHIP_FOCUS =
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary";
const RETRY_BTN =
  "cursor-pointer border border-primary px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary hover:bg-primary hover:text-primary-foreground disabled:cursor-wait disabled:opacity-60";

/* Service desk ----------------------------------------------------- */

const FIX_POLL_MS = 10_000;

const ACTIVE_FIX_STATUSES = ["new", "quoted", "in_progress"] as const;
const CLOSED_FIX_STATUSES = ["declined", "cancelled"] as const;

const FIX_STATUS_META: Record<
  string,
  { label: string; style: string; step: number }
> = {
  new: {
    label: "Submitted",
    style: "border-scout-amber/40 bg-scout-amber/10 text-scout-amber",
    step: 1,
  },
  quoted: {
    label: "Quotation ready",
    style: "border-primary/40 bg-primary/10 text-primary",
    step: 2,
  },
  in_progress: {
    label: "In progress",
    style: "border-primary/40 bg-primary/10 text-primary",
    step: 3,
  },
  delivered: {
    label: "Delivered",
    style: "border-scout-mint/40 bg-scout-mint/10 text-scout-mint",
    step: 4,
  },
  declined: {
    label: "Declined",
    style: "border-scout-red/40 bg-scout-red/10 text-scout-red",
    step: 0,
  },
  cancelled: {
    label: "Cancelled",
    style: "border-border bg-secondary text-muted-foreground",
    step: 0,
  },
};

const LIFECYCLE_STEPS = [
  "Submitted",
  "Quoted",
  "In progress",
  "Delivered",
] as const;

const STATUS_FILTERS: ReadonlyArray<readonly [StatusFilter, string]> = [
  ["all", "All"],
  ["active", "Active"],
  ["delivered", "Delivered"],
  ["closed", "Closed"],
];

function isActiveFix(status: string): boolean {
  return (ACTIVE_FIX_STATUSES as readonly string[]).includes(status);
}

function isClosedFix(status: string): boolean {
  return (CLOSED_FIX_STATUSES as readonly string[]).includes(status);
}

function matchesFilter(status: string, filter: StatusFilter): boolean {
  switch (filter) {
    case "active":
      return isActiveFix(status);
    case "delivered":
      return status === "delivered";
    case "closed":
      return isClosedFix(status);
    default:
      return true;
  }
}

function timeOf(value: string | Date): number {
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

const NOOP = () => {};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
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

  const { data: areas } = trpc.grid.areas.useQuery(undefined, {
    staleTime: AREAS_STALE_MS,
  });

  const counts = useMemo(
    () => new Map<AreaName, number>(areas?.map((a) => [a.name, a.businesses])),
    [areas],
  );

  const scan = trpc.grid.scan.useQuery(
    scanParams
      ? {
          area: scanParams.area,
          ...(scanParams.category !== "all"
            ? { category: scanParams.category }
            : {}),
        }
      : skipToken,
    { staleTime: SCAN_STALE_MS },
  );

  const audit = trpc.grid.audit.useQuery(
    selectedId !== null ? { businessId: selectedId } : skipToken,
    { staleTime: AUDIT_STALE_MS },
  );

  const results = useMemo(
    () =>
      sortOpportunities(
        (scan.data ?? []).filter((r) =>
          r.lostRevenueKes === null
            ? minLeak === 0
            : r.lostRevenueKes >= minLeak,
        ),
        sortMode,
      ),
    [scan.data, minLeak, sortMode],
  );

  const capped = (scan.data?.length ?? 0) >= SCAN_MAX_RESULTS;

  const stats = useMemo<ScanStats>(() => {
    let invisible = 0;
    let leak = 0;
    let revenueAssessed = 0;
    let gaps = 0;

    for (const r of results) {
      if (
        r.scores.visibility !== null &&
        scoreBand(r.scores.visibility) === "invisible"
      ) {
        invisible++;
      }

      if (r.lostRevenueKes !== null) {
        leak += r.lostRevenueKes;
        revenueAssessed++;
      }

      gaps += r.issues.length;
    }

    return { invisible, leak, revenueAssessed, gaps };
  }, [results]);

  const isStale =
    scanParams !== null &&
    (scanParams.area !== area || scanParams.category !== category);

  const runScan = useCallback(() => {
    setScanParams({ area, category });
    setSelectedId(null);
    setShowAll(false);
    setSweepKey((k) => k + 1);
    void utils.grid.scan.invalidate();
  }, [area, category, utils]);

  const handleExport = useCallback(() => {
    const csv = toCsv(results, (c) =>
      isCategory(c) ? CATEGORY_META[c].label : c,
    );

    downloadCsv(
      `gridscout-${scanParams?.area ?? area}.csv`
        .toLowerCase()
        .replace(/\s+/g, "-"),
      csv,
    );
  }, [results, scanParams, area]);

  const handleBuyCredits = useCallback(() => {
    if (isAdmin) return;
    setCheckoutOpen(true);
  }, [isAdmin]);

  const handleUnlocked = useCallback(() => {
    void utils.grid.audit.invalidate();
    void utils.leads.list.invalidate();
    if (!isAdmin) void utils.payments.wallet.invalidate();
  }, [utils, isAdmin]);

  const handleSelectCategory = useCallback((v: string) => {
    if (v === "all" || isCategory(v)) setCategory(v);
  }, []);

  const handleMinLeak = useCallback((n: number) => {
    setMinLeak(n);
    setShowAll(false);
  }, []);

  useEffect(() => {
    if (isAdmin && checkoutOpen) setCheckoutOpen(false);
  }, [isAdmin, checkoutOpen]);

  useEffect(() => {
    if (selectedId === null || checkoutOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, checkoutOpen]);

  useEffect(() => {
    if (selectedId === null) return;

    if (window.matchMedia(MOBILE_QUERY).matches) {
      detailRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [selectedId]);

  const { center: areaCenter, zoom: areaZoom } = AREA_META[area];
  const auditMissing =
    !audit.isLoading && (audit.isError || audit.data === null);

  return (
    <div className="scanlines relative flex min-h-dvh flex-col bg-background">
      <ConsoleHeader onBuyCredits={isAdmin ? NOOP : handleBuyCredits} />

      <main className="grid flex-1 grid-cols-1 lg:grid-cols-[270px_1fr_370px]">
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
          hasScanned={scan.isSuccess}
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
        </section>

        <aside
          ref={detailRef}
          className="hairline-t order-3 flex min-h-[420px] flex-col border-border lg:border-l lg:border-t-0"
        >
          {isAdmin && <AdminOperations />}

          <div className="min-h-0 flex-1">
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
                    <AuditFallback
                      isError={audit.isError}
                      retrying={audit.isFetching}
                      onRetry={() => void audit.refetch()}
                    />
                  ) : (
                    <AuditPanel
                      audit={audit.data}
                      loading={audit.isLoading}
                      onBuyCredits={isAdmin ? NOOP : handleBuyCredits}
                      onUnlocked={handleUnlocked}
                    />
                  )}
                </div>
              </div>
            ) : (
              <PriorityTargets
                results={results}
                loading={scan.isLoading}
                syncing={scan.isFetching && !scan.isLoading}
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
          </div>
        </aside>
      </main>

      <ServiceDesk isAdmin={isAdmin} />

      {!isAdmin && (
        <StkModal open={checkoutOpen} onOpenChange={setCheckoutOpen} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Admin operations rail                                               */
/* ------------------------------------------------------------------ */

function AdminOperations() {
  return (
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
        Internal administration tools. Admin accounts have unlimited access:
        no credits are ever charged.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Audit fallback                                                      */
/* ------------------------------------------------------------------ */

function AuditFallback({
  isError,
  retrying,
  onRetry,
}: {
  isError: boolean;
  retrying: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-scout-red">
        {isError ? "Audit failed to load" : "Business not found"}
      </p>

      {isError && (
        <button onClick={onRetry} disabled={retrying} className={RETRY_BTN}>
          {retrying ? "Retrying…" : "Retry"}
        </button>
      )}
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
                    <span className="text-[10px] opacity-60">
                      {counts.get(a) ?? "—"}
                    </span>
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
        {scanning
          ? "Scanning…"
          : stale || !hasScanned
            ? "Initiate scan"
            : "Re-scan"}
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

        <div
          className="grid grid-cols-2 gap-1"
          role="group"
          aria-label="Rank by"
        >
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

        <RadarToggle
          checked={showHeat}
          onChange={onToggleHeat}
          label="Demand heatmap"
          hint="revenue leak intensity"
        />

        <RadarToggle
          checked={showRings}
          onChange={onToggleRings}
          label="Competitor rings"
          hint="radius around selection"
        />
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
          <StatRow
            label="Contacts"
            value={`${resultCount}${capped && minLeak === 0 ? "+" : ""}`}
          />
          <StatRow
            label="Invisible"
            value={stats.invisible}
            tone="text-scout-red"
          />
          <StatRow
            label="Gaps found"
            value={stats.gaps}
            tone="text-scout-amber"
          />
          <StatRow
            label="Assessed combined leak"
            value={
              stats.revenueAssessed === 0
                ? "Not estimated"
                : `${fmtCompactKes(stats.leak)}/mo`
            }
            tone="text-scout-red"
          />

          {capped && (
            <p className="pt-1 text-[9px] normal-case tracking-normal opacity-70">
              Showing top {SCAN_MAX_RESULTS} by revenue at risk. Filter by
              category to see the rest.
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
  loading,
  syncing,
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
  loading: boolean;
  syncing: boolean;
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
        <div className="tech-label tech-label--live mb-4">
          Intercepting signals…
        </div>

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
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-scout-red">
          Signal lost
        </p>

        <button onClick={onRetry} className={RETRY_BTN}>
          Retry scan
        </button>
      </div>
    );
  }

  const visible = showAll ? results : results.slice(0, PAGE);

  return (
    <div className="flex h-full flex-col">
      <div className="hairline-b p-4">
        <div className="flex items-center gap-2">
          <div className="tech-label tech-label--live">Priority targets</div>

          {syncing && (
            <span
              className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground"
              aria-live="polite"
            >
              Re-syncing
            </span>
          )}
        </div>

        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {sortMode === "quickwin"
            ? "Ranked by easiest win first"
            : "Ranked by monthly revenue at risk"}
        </p>

        <p className="mt-1 font-mono text-[9px] normal-case tracking-wide text-muted-foreground/70">
          Top {FREE_GAPS} gaps are free. Unlock a lead for the full list, fix
          plan and contact.
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
          {CATEGORY_META[result.category].label} ·{" "}
          {result.issues[0] ?? "no major gaps"}
        </span>

        {result.issues.length > 0 && (
          <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-wider text-scout-amber">
            {result.issues.length} gap
            {result.issues.length === 1 ? "" : "s"}
            {hidden > 0 ? ` · ${hidden} hidden` : ""}
          </span>
        )}
      </span>

      <span className="text-right">
        <span className="block font-display text-sm font-bold text-scout-red">
          {result.lostRevenueKes === null
            ? "Not estimated"
            : fmtCompactKes(result.lostRevenueKes)}
        </span>

        <span
          className="block font-mono text-[10px]"
          style={{ color: scoreColor(result.scores.visibility) }}
        >
          VIS {result.scores.visibility ?? "Not assessed"}
        </span>
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Service Desk (customer + admin)                                     */
/* ------------------------------------------------------------------ */

function ServiceDesk({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<DeskTab>("mine");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  // Signed-in user's own requests.
  const mine = trpc.fixes.mine.useQuery(undefined, {
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: 1,
    refetchIntervalInBackground: false,
    refetchInterval: (query) =>
      (query.state.data ?? []).some((r) => isActiveFix(r.status))
        ? FIX_POLL_MS
        : false,
  });

  // Admin-only: all client requests.
  // This is the actual procedure exposed by api/fixes-router.ts.
  const clients = trpc.fixes.adminList.useQuery(
    {},
    {
      enabled: isAdmin,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
      staleTime: 0,
      retry: 1,
      refetchIntervalInBackground: false,
      refetchInterval: (query) =>
        (query.state.data ?? []).some((r) => isActiveFix(r.status))
          ? FIX_POLL_MS
          : false,
    },
  );

  const activeTab: DeskTab = isAdmin ? tab : "mine";
  const q = activeTab === "clients" ? clients : mine;
  const showClient = activeTab === "clients";

  const rows = useMemo<ServiceRequestRow[]>(
    () => (q.data as ServiceRequestRow[] | undefined) ?? [],
    [q.data],
  );

  const totals = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((r) => isActiveFix(r.status)).length,
      delivered: rows.filter((r) => r.status === "delivered").length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return rows
      .filter((r) => matchesFilter(r.status, filter))
      .filter((r) => {
        if (!needle) return true;

        const hay = [
          `#${r.id}`,
          r.business?.name,
          r.client?.name,
          r.client?.email,
          r.client?.phone,
          ...(r.packages ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return hay.includes(needle);
      })
      .sort((a, b) => {
        const live =
          Number(isActiveFix(b.status)) - Number(isActiveFix(a.status));

        return live !== 0
          ? live
          : timeOf(b.createdAt) - timeOf(a.createdAt);
      });
  }, [rows, filter, search]);

  const switchTab = (next: DeskTab) => {
    setTab(next);
    setFilter("all");
    setSearch("");
  };

  return (
    <section
      id="my-service-requests"
      className="hairline-t border-border bg-card/20 px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="tech-label tech-label--live">
              {isAdmin ? "Service desk / 01" : "Customer operations / 01"}
            </div>

            <h2 className="mt-2 font-display text-xl font-bold uppercase tracking-wider text-foreground sm:text-2xl">
              {showClient ? "Client Service Requests" : "My Service Requests"}
            </h2>

            <p className="mt-2 max-w-xl font-mono text-[10px] leading-relaxed text-muted-foreground sm:text-xs">
              {showClient
                ? "Every service requested by clients, with who asked, what they asked for and where it stands."
                : "Track your submitted requests, quotations and service delivery from one place."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {q.isFetching && !q.isLoading && (
              <span
                className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground"
                aria-live="polite"
              >
                Syncing
              </span>
            )}

            {showClient && (
              <Link
                to="/admin/fixes"
                className="border border-primary/50 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Manage →
              </Link>
            )}

            <button
              type="button"
              onClick={() => void q.refetch()}
              disabled={q.isFetching}
              className="cursor-pointer border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-wait disabled:opacity-50"
            >
              {q.isFetching ? "Refreshing..." : "↻ Refresh requests"}
            </button>
          </div>
        </div>

        {isAdmin && (
          <div
            className="mb-4 flex gap-1"
            role="tablist"
            aria-label="Service request views"
          >
            {(
              [
                ["mine", "My requests", mine.data?.length],
                ["clients", "Client requests", clients.data?.length],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                role="tab"
                aria-selected={activeTab === key}
                onClick={() => switchTab(key)}
                className={`cursor-pointer border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${CHIP_FOCUS} ${
                  activeTab === key ? CHIP_ON : CHIP_OFF
                }`}
              >
                {label}
                {count !== undefined && (
                  <span className="ml-2 opacity-60">{count}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {q.isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="h-40 animate-pulse border border-border bg-secondary/30"
              />
            ))}
          </div>
        ) : q.isError ? (
          <div className="border border-scout-red/30 bg-scout-red/5 p-6">
            <p className="font-mono text-xs uppercase tracking-wider text-scout-red">
              {showClient
                ? "Unable to retrieve client requests"
                : "Unable to retrieve your service requests"}
            </p>

            <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
              {q.error?.message ?? "The Service Desk could not be reached."}
            </p>

            <button
              type="button"
              onClick={() => void q.refetch()}
              disabled={q.isFetching}
              className="mt-3 cursor-pointer font-mono text-[10px] uppercase tracking-widest text-primary hover:underline disabled:opacity-50"
            >
              Retry connection →
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="border border-dashed border-border bg-secondary/10 px-6 py-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-border font-mono text-xl text-primary">
              +
            </div>

            <h3 className="font-display text-sm font-bold uppercase tracking-wider">
              {showClient
                ? "No client requests yet"
                : "No service requests yet"}
            </h3>

            <p className="mx-auto mt-2 max-w-md font-mono text-[10px] leading-relaxed text-muted-foreground">
              {showClient
                ? "When a client requests a GRIDSCOUT fix from a business audit, it will appear here."
                : "When you request a GRIDSCOUT fix from a business audit, it will appear here. Submitting a request is free."}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-3 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                <span>
                  Total:{" "}
                  <strong className="text-foreground">{totals.total}</strong>
                </span>
                <span>
                  Active:{" "}
                  <strong className="text-primary">{totals.active}</strong>
                </span>
                <span>
                  Delivered:{" "}
                  <strong className="text-scout-mint">
                    {totals.delivered}
                  </strong>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1" role="group" aria-label="Status">
                  {STATUS_FILTERS.map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => setFilter(v)}
                      aria-pressed={filter === v}
                      className={`cursor-pointer border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors ${CHIP_FOCUS} ${
                        filter === v ? CHIP_ON : CHIP_OFF
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    showClient ? "Search client, business, service…" : "Search…"
                  }
                  aria-label="Search service requests"
                  className="w-56 border border-border bg-secondary px-3 py-1.5 font-mono text-[10px] tracking-wide text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {visible.length === 0 ? (
              <p className="border border-dashed border-border px-6 py-8 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                No requests match your filters.
              </p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {visible.map((request) => (
                  <ServiceRequestCard
                    key={request.id}
                    request={request}
                    showClient={showClient}
                  />
                ))}
              </div>
            )}
          </>
        )}

        <p className="mt-5 font-mono text-[9px] leading-relaxed text-muted-foreground/70">
          Quotations and work updates are managed by the GRIDSCOUT Service
          Desk. A submitted request is not a payment or confirmation that work
          has started.
        </p>
      </div>
    </section>
  );
}

function ServiceRequestCard({
  request,
  showClient = false,
}: {
  request: ServiceRequestRow;
  showClient?: boolean;
}) {
  const status = FIX_STATUS_META[request.status] ?? {
    label: request.status,
    style: "border-border bg-secondary text-muted-foreground",
    step: 0,
  };

  const date = new Date(request.createdAt);
  const dateLabel = Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString();

  const closed = isClosedFix(request.status);
  const packages = request.packages ?? [];
  const client = request.client;

  return (
    <article className="border border-border bg-card/60 transition-colors hover:border-primary/40">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 p-4">
        <div className="min-w-0">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            Request / #{request.id}
          </div>

          <h3 className="mt-1 truncate font-display text-base font-bold uppercase tracking-wide">
            {request.business?.name ?? "Business service request"}
          </h3>

          <p className="mt-1 font-mono text-[9px] text-muted-foreground">
            {dateLabel}
          </p>
        </div>

        <span
          className={`shrink-0 border px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest ${status.style}`}
        >
          {status.label}
        </span>
      </div>

      <div className="space-y-4 p-4">
        {showClient && (
          <div className="border border-border/70 bg-background/50 p-3">
            <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Requested by
            </div>

            <div className="text-sm font-semibold text-foreground">
              {client?.name ?? "Unknown client"}
            </div>

            {(client?.email || client?.phone) && (
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-muted-foreground">
                {client?.email && (
                  <a
                    href={`mailto:${client.email}`}
                    className="hover:text-primary hover:underline"
                  >
                    {client.email}
                  </a>
                )}
                {client?.phone && (
                  <a
                    href={`tel:${client.phone}`}
                    className="hover:text-primary hover:underline"
                  >
                    {client.phone}
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            Requested services
          </div>

          {packages.length === 0 ? (
            <p className="font-mono text-[10px] text-muted-foreground">
              No services listed.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {packages.map((item) => (
                <span
                  key={item}
                  className="border border-border bg-secondary/50 px-2 py-1 font-mono text-[9px] uppercase tracking-wide text-foreground"
                >
                  {item.replace(/[-_]/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="border border-border/70 bg-background/50 p-3">
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Plan estimate
            </div>

            <div className="mt-1 font-display text-lg font-bold">
              {fmtCompactKes(request.totalKes)}
            </div>
          </div>

          <div className="border border-primary/20 bg-primary/5 p-3">
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Quotation
            </div>

            <div className="mt-1 font-display text-lg font-bold text-primary">
              {request.quotedKes == null
                ? "Pending"
                : fmtCompactKes(request.quotedKes)}
            </div>
          </div>
        </div>

        {request.note && (
          <div>
            <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              {showClient ? "Client instructions" : "Your instructions"}
            </div>

            <p className="text-xs leading-relaxed text-foreground/80">
              {request.note}
            </p>
          </div>
        )}

        {request.adminNote && (
          <div className="border-l-2 border-primary/50 bg-primary/5 p-3">
            <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-primary">
              Service Desk update
            </div>

            <p className="text-xs leading-relaxed text-foreground/80">
              {request.adminNote}
            </p>
          </div>
        )}

        {status.step > 0 && (
          <div className="border-t border-border/70 pt-3">
            <div className="mb-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Request lifecycle
            </div>

            <div className="grid grid-cols-4 gap-1">
              {LIFECYCLE_STEPS.map((label, index) => {
                const active = index + 1 <= status.step;

                return (
                  <div key={label}>
                    <div
                      className={`mb-1 h-1 ${
                        active ? "bg-primary" : "bg-secondary"
                      }`}
                    />

                    <span
                      className={`font-mono text-[8px] uppercase ${
                        active ? "text-primary" : "text-muted-foreground/50"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {closed && (
          <div className="border-t border-border/70 pt-3">
            <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              {showClient
                ? "This request is closed."
                : "This request is closed. Contact the GRIDSCOUT Service Desk if you need further assistance."}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Small primitives                                                    */
/* ------------------------------------------------------------------ */

function LegendRow({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
      {label}
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
