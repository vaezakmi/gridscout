import { useMemo, useState } from "react";
import { Navigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fmtKes } from "@/lib/format";
import { FIX_PACKAGE_META } from "@contracts/grid";
import {
  FIX_REQUEST_STATUS_META,
  type FixRequestStatus,
} from "@contracts/fixes";

type StatusFilter = FixRequestStatus | "all";

const STATUS_COLOR: Record<string, string> = {
  red: "hsl(var(--scout-red))",
  amber: "hsl(var(--scout-amber))",
  mint: "hsl(var(--scout-mint))",
  primary: "hsl(var(--primary))",
  neutral: "hsl(var(--muted-foreground))",
};

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString();
}

export default function AdminFixes() {
  const { user, isLoading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
  });

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [quoteDrafts, setQuoteDrafts] = useState<Record<number, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const {
    data: requests,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.fixes.adminList.useQuery({});

  const updateRequest = trpc.fixes.adminUpdate.useMutation({
    onSuccess: async () => {
      setValidationError(null);
      await utils.fixes.adminList.invalidate();
      await utils.fixes.mine.invalidate();
    },
  });

  const visible = useMemo(
    () =>
      (requests ?? []).filter(
        (request) => filter === "all" || request.status === filter,
      ),
    [requests, filter],
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

  const saveQuote = (request: (typeof visible)[number]) => {
    const raw = quoteDrafts[request.id] ?? String(
      request.quotedKes ?? request.totalKes,
    );
    const amount = Number(raw);

    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 10_000_000) {
      setValidationError(
        `Request #${request.id}: enter a whole-number quote between KES 1 and KES 10,000,000.`,
      );
      return;
    }

    updateRequest.mutate({
      id: request.id,
      status: "quoted",
      quotedKes: amount,
      adminNote: noteDrafts[request.id] ?? request.adminNote ?? "",
    });
  };

  const changeStatus = (
    requestId: number,
    status: FixRequestStatus,
  ) => {
    updateRequest.mutate({
      id: requestId,
      status,
      adminNote: noteDrafts[requestId] ?? "",
    });
  };

  return (
    <div className="scanlines min-h-dvh bg-background">
      <ConsoleHeader onBuyCredits={() => undefined} />

      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="tech-label tech-label--live mb-3">
              GridScout operations
            </div>
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
              Service <span className="text-primary">desk</span>
            </h1>
            <p className="mt-2 max-w-xl font-mono text-xs leading-relaxed text-muted-foreground">
              Review agency requests, prepare quotes and manage delivery status.
              Quotes require agency acceptance before work begins.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
            className="font-mono text-xs uppercase tracking-wider"
          >
            Refresh queue
          </Button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ["new", "New"],
              ["quoted", "Awaiting response"],
              ["in_progress", "In progress"],
              ["delivered", "Delivered"],
            ] as const
          ).map(([status, label]) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`border p-3 text-left transition-colors ${
                filter === status
                  ? "border-primary/60 bg-primary/10"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {label}
              </span>
              <span className="mt-1 block font-display text-2xl font-bold">
                {(requests ?? []).filter((r) => r.status === status).length}
              </span>
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold uppercase">
            Request queue
            <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
              ({visible.length})
            </span>
          </h2>

          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as StatusFilter)
            }
            className="border border-border bg-secondary px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-foreground"
            aria-label="Filter requests"
          >
            <option value="all">All requests</option>
            {Object.entries(FIX_REQUEST_STATUS_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>

        {validationError && (
          <div role="alert" className="mb-4 border border-scout-red/50 bg-scout-red/10 p-3 font-mono text-xs text-scout-red">
            {validationError}
          </div>
        )}

        {updateRequest.isError && (
          <div role="alert" className="mb-4 border border-scout-red/50 bg-scout-red/10 p-3 font-mono text-xs text-scout-red">
            Could not update request: {updateRequest.error.message}
            <button
              onClick={() => updateRequest.reset()}
              className="ml-3 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="border border-border p-8 font-mono text-xs text-muted-foreground">
            Loading service requests...
          </div>
        ) : isError ? (
          <div className="border border-scout-red/50 p-8 text-center">
            <p className="font-mono text-xs text-scout-red">
              Could not load the admin queue: {error.message}
            </p>
            <Button onClick={() => refetch()} className="mt-4">
              Retry
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              No requests in this queue
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((request) => {
              const statusMeta = FIX_REQUEST_STATUS_META[request.status];
              const statusColor = STATUS_COLOR[statusMeta.tone];
              const canQuote =
                request.status === "new" || request.status === "quoted";
              const canDecline = canQuote;
              const canCancel = [
                "new",
                "quoted",
                "in_progress",
              ].includes(request.status);
              const canDeliver = request.status === "in_progress";

              return (
                <article
                  key={request.id}
                  className="border border-border bg-card p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-base font-bold uppercase">
                        {request.business.name}
                      </h3>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {request.business.area} · Request #{request.id}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {request.requester.name || "Unnamed agency"} · {request.requester.email} · User #{request.userId}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                        Submitted {formatDate(request.createdAt)}
                      </p>
                    </div>

                    <span
                      className="border px-2 py-1 font-mono text-[10px] uppercase tracking-wider"
                      style={{
                        color: statusColor,
                        borderColor: statusColor,
                      }}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Requested services
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {request.packages.map((packageId) => (
                        <span
                          key={packageId}
                          className="border border-border px-2 py-1 font-mono text-[10px]"
                        >
                          {FIX_PACKAGE_META[packageId as keyof typeof FIX_PACKAGE_META]?.label ?? packageId}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-6 font-mono text-xs">
                    <span className="text-muted-foreground">
                      Initial estimate:{" "}
                      <strong className="text-foreground">
                        {fmtKes(request.totalKes)}
                      </strong>
                    </span>
                    <span className="text-muted-foreground">
                      Current quote:{" "}
                      <strong className="text-primary">
                        {request.quotedKes == null
                          ? "Not quoted"
                          : fmtKes(request.quotedKes)}
                      </strong>
                    </span>
                  </div>

                  {request.note && (
                    <div className="mt-4 border-l-2 border-border pl-3">
                      <p className="font-mono text-[10px] uppercase text-muted-foreground">
                        Agency instructions
                      </p>
                      <p className="mt-1 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                        {request.note}
                      </p>
                    </div>
                  )}

                  <div className="mt-5 grid gap-3 border-t border-border pt-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Quote amount (KES)
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={10_000_000}
                        step={1}
                        disabled={!canQuote || updateRequest.isPending}
                        value={
                          quoteDrafts[request.id] ??
                          String(request.quotedKes ?? request.totalKes)
                        }
                        onChange={(event) =>
                          setQuoteDrafts((drafts) => ({
                            ...drafts,
                            [request.id]: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Internal admin note
                      </label>
                      <Textarea
                        rows={2}
                        maxLength={1000}
                        disabled={updateRequest.isPending}
                        value={
                          noteDrafts[request.id] ?? request.adminNote ?? ""
                        }
                        onChange={(event) =>
                          setNoteDrafts((drafts) => ({
                            ...drafts,
                            [request.id]: event.target.value,
                          }))
                        }
                        placeholder="Internal notes for this request..."
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {canQuote && (
                      <Button
                        size="sm"
                        disabled={updateRequest.isPending}
                        onClick={() => saveQuote(request)}
                        className="font-mono text-[10px] uppercase tracking-wider"
                      >
                        {request.status === "quoted"
                          ? "Save revised quote"
                          : "Send quote to agency"}
                      </Button>
                    )}

                    {canDecline && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updateRequest.isPending}
                        onClick={() => {
                          if (window.confirm(`Decline request #${request.id}?`)) {
                            changeStatus(request.id, "declined");
                          }
                        }}
                        className="font-mono text-[10px] uppercase tracking-wider"
                      >
                        Decline
                      </Button>
                    )}

                    {canDeliver && (
                      <Button
                        size="sm"
                        disabled={updateRequest.isPending}
                        onClick={() => {
                          if (window.confirm("Record this as admin-confirmed delivery? No delivery evidence is attached. Continue?")) {
                            changeStatus(request.id, "delivered");
                          }
                        }}
                        className="font-mono text-[10px] uppercase tracking-wider"
                      >
                        Confirm delivery
                      </Button>
                    )}

                    {canCancel && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={updateRequest.isPending}
                        onClick={() => {
                          if (window.confirm(`Cancel request #${request.id}?`)) {
                            changeStatus(request.id, "cancelled");
                          }
                        }}
                        className="font-mono text-[10px] uppercase tracking-wider text-scout-red"
                      >
                        Cancel request
                      </Button>
                    )}

                    {request.status === "quoted" && (
                      <span className="self-center font-mono text-[10px] text-muted-foreground">
                        Awaiting agency decision
                      </span>
                    )}

                    {request.status === "in_progress" && (
                      <span className="self-center font-mono text-[10px] text-muted-foreground">
                        Agency accepted · work in progress
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}