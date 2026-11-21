import { useState } from "react";
import { Navigate } from "react-router";
import { AREA_LIST, DEFAULT_AREA, type AreaName } from "@contracts/grid";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function AdminOsm() {
  const { user, isLoading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const [area, setArea] = useState<AreaName>(DEFAULT_AREA);

  const {
    data: preview,
    isFetching,
    isError,
    error,
    refetch,
  } = trpc.osm.preview.useQuery(
    { area },
    { enabled: false, retry: false },
  );

  if (authLoading) {
    return (
      <div className="min-h-dvh bg-background p-8 font-mono text-xs text-muted-foreground">
        Verifying admin access...
      </div>
    );
  }

  if (user?.role !== "admin") {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="scanlines min-h-dvh bg-background">
      <ConsoleHeader onBuyCredits={() => undefined} />

      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <header className="mb-7">
          <div className="tech-label tech-label--live mb-3">
            GridScout data operations
          </div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
            OpenStreetMap <span className="text-primary">preview</span>
          </h1>
          <p className="mt-2 max-w-2xl font-mono text-xs leading-relaxed text-muted-foreground">
            Inspect potential business listings before any future data-quality
            review. This page does not import records or change the database.
          </p>
        </header>

        <section className="mb-6 border border-border bg-card p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <label
                htmlFor="osm-area"
                className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
              >
                Preview area
              </label>
              <select
                id="osm-area"
                value={area}
                onChange={(event) => setArea(event.target.value as AreaName)}
                disabled={isFetching}
                className="w-full border border-border bg-secondary px-3 py-2.5 font-mono text-xs text-foreground"
              >
                {AREA_LIST.map((areaName) => (
                  <option key={areaName} value={areaName}>
                    {areaName}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={() => void refetch()}
              disabled={isFetching}
              className="font-mono text-xs uppercase tracking-wider"
            >
              {isFetching ? "Loading preview..." : "Load preview"}
            </Button>
          </div>
          <p className="mt-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
            The provider is contacted only when you select Load preview.
            Results are cached briefly by the server and limited to 300
            candidates.
          </p>
        </section>

        {isError && (
          <div
            role="alert"
            className="mb-5 border border-scout-red/50 bg-scout-red/10 p-4 font-mono text-xs text-scout-red"
          >
            Could not load the OpenStreetMap preview: {error.message}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="ml-3"
            >
              Retry
            </Button>
          </div>
        )}

        {preview && (
          <>
            <section className="mb-5">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-bold uppercase">
                    {preview.area} results
                  </h2>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    Retrieved {formatDate(preview.fetchedAt)}
                  </p>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Source: OpenStreetMap
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["Returned by provider", preview.totalReturned],
                  ["Included", preview.included],
                  ["Needs review", preview.needsReview],
                  ["Skipped", preview.skipped],
                ].map(([label, value]) => (
                  <div key={label} className="border border-border bg-card p-3">
                    <span className="block font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      {label}
                    </span>
                    <span className="mt-1 block font-display text-2xl font-bold tabular-nums">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {preview.truncated && (
              <div className="mb-4 border border-scout-amber/50 bg-scout-amber/10 p-3 font-mono text-xs text-foreground">
                Preview limit reached. The candidate list may be incomplete;
                this is not a complete directory of the selected area.
              </div>
            )}

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold uppercase">
                Candidate listings
              </h2>
              <span className="font-mono text-[10px] text-muted-foreground">
                {preview.candidates.length} shown
              </span>
            </div>

            {preview.candidates.length === 0 ? (
              <div className="border border-dashed border-border p-10 text-center font-mono text-xs text-muted-foreground">
                No eligible named listings were returned for this preview.
              </div>
            ) : (
              <div className="space-y-2">
                {preview.candidates.map((candidate) => (
                  <article
                    key={candidate.externalId}
                    className="border border-border bg-card p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-display text-sm font-bold uppercase">
                          {candidate.name}
                        </h3>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                          {candidate.address ?? "No address supplied"}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                          {candidate.externalId} · {candidate.latitude.toFixed(5)}, {candidate.longitude.toFixed(5)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-wider">
                          {candidate.categoryStatus === "mapped"
                            ? candidate.category
                            : "Needs category review"}
                        </span>
                        <a
                          href={candidate.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[10px] text-primary underline underline-offset-4"
                        >
                          View source
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        <footer className="mt-8 border-t border-border pt-4 font-mono text-[10px] leading-relaxed text-muted-foreground">
          Map data and candidate information © OpenStreetMap contributors.
          Data is available under the Open Database License (ODbL).{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-4"
          >
            OpenStreetMap attribution and licence
          </a>
          .
        </footer>
      </main>
    </div>
  );
}