import { useMemo, useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import {
  CATEGORY_META,
  FIX_PACKAGE_META,
  LEAD_STATUS_LIST,
  LEAD_STATUS_META,
  type LeadStatus,
  type Tone,
} from "@contracts/grid";
import { FIX_REQUEST_STATUS_META } from "@contracts/fixes";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { StkModal } from "@/components/StkModal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fmtCompactKes, fmtKes, scoreColor } from "@/lib/format";
import { bandPlan, buildQuoteText, fixValueKes } from "@/lib/opportunity";

const TONE_COLOR: Record<Tone, string> = {
  red: "hsl(var(--scout-red))",
  amber: "hsl(var(--scout-amber))",
  mint: "hsl(var(--scout-mint))",
  primary: "hsl(var(--primary))",
  neutral: "hsl(var(--muted-foreground))",
};

const ACTIVE_STATUSES: readonly LeadStatus[] = ["new", "contacted", "replied"];

type StatusFilter = LeadStatus | "all";
type SortMode = "value" | "newest";

function parseWebsite(raw: string) {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return { href: u.href, label: u.host.replace(/^www\./, "") };
  } catch {
    return null;
  }
}

function timeAgo(value: Date | string): string {
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60_000));
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function Leads() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const isAdmin = user?.role === "admin";

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("value");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedQuoteId, setCopiedQuoteId] = useState<number | null>(null);

  const { data: leads, isLoading, isError, refetch } = trpc.leads.list.useQuery();
  const utils = trpc.useUtils();
  const {
    data: fixRequests,
    isLoading: fixRequestsLoading,
    isError: fixRequestsError,
  } = trpc.fixes.mine.useQuery();

  const acceptQuote = trpc.fixes.acceptQuote.useMutation({
    onSuccess: () => utils.fixes.mine.invalidate(),
  });

  const declineQuote = trpc.fixes.declineQuote.useMutation({
    onSuccess: () => utils.fixes.mine.invalidate(),
  });
  const setStatus = trpc.leads.setStatus.useMutation({
    onSuccess: () => utils.leads.list.invalidate(),
  });

  const counts = useMemo(() => {
    const c = Object.fromEntries(LEAD_STATUS_LIST.map((s) => [s, 0])) as Record<LeadStatus, number>;
    for (const l of leads ?? []) c[l.status]++;
    return c;
  }, [leads]);

  const stats = useMemo(() => {
    const list = leads ?? [];
    const closed = counts.won + counts.lost;
    const open = list.filter((l) => ACTIVE_STATUSES.includes(l.status));
    return {
      total: list.length,
      won: counts.won,
      winRate: closed === 0 ? null : Math.round((counts.won / closed) * 100),
      pipeline: open.reduce((s, l) => s + l.business.lostRevenueKes, 0),
      fixPipeline: open.reduce((s, l) => s + fixValueKes(l.business.scores.visibility), 0),
    };
  }, [leads, counts]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (leads ?? [])
      .filter((l) => filter === "all" || l.status === filter)
      .filter((l) => {
        if (!q) return true;
        const b = l.business;
        return (
          b.name.toLowerCase().includes(q) ||
          b.area.toLowerCase().includes(q) ||
          b.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
          CATEGORY_META[b.category].label.toLowerCase().includes(q)
        );
      })
      .sort((a, b) =>
        sort === "value"
          ? b.business.lostRevenueKes - a.business.lostRevenueKes
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [leads, filter, query, sort]);

  const copyText = async (text: string, mark: () => void, clear: () => void) => {
    try {
      await navigator.clipboard.writeText(text);
      mark();
      setTimeout(clear, 1500);
    } catch {
      /* clipboard blocked; the text is still selectable on screen */
    }
  };

  const saveNotes = (leadId: number, status: LeadStatus, notes: string) =>
    setStatus.mutate(
      { leadId, status, notes },
      {
        onSuccess: () =>
          setNoteDrafts((d) => {
            const { [leadId]: _dropped, ...rest } = d;
            return rest;
          }),
      },
    );

  return (
    <div className="scanlines relative flex min-h-dvh flex-col bg-background">
      <ConsoleHeader onBuyCredits={() => !isAdmin && setCheckoutOpen(true)} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <section className="mb-8 border border-border bg-card/40 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="tech-label tech-label--live mb-2">Agency jobs</div>
              <h2 className="font-display text-xl font-bold uppercase tracking-tight">
                My service <span className="text-primary">requests</span>
              </h2>
            </div>
            <Link
              to="/app"
              className="border border-primary/40 bg-primary/10 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-primary hover:bg-primary/20"
            >
              Open audit console
            </Link>
          </div>

          {fixRequestsLoading ? (
            <p className="font-mono text-xs text-muted-foreground">Loading service requests...</p>
          ) : fixRequestsError ? (
            <p className="font-mono text-xs text-scout-red">
              Could not load service requests. Refresh the page and try again.
            </p>
          ) : !fixRequests?.length ? (
            <div className="border border-dashed border-border p-5 text-center">
              <p className="font-mono text-xs text-muted-foreground">
                No service requests yet. Open a lead audit in the Console to submit an exact fix plan.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {fixRequests.map((request) => {
                const statusMeta = FIX_REQUEST_STATUS_META[request.status];

                return (
                  <article
                    key={request.id}
                    className="border border-border bg-background/60 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-sm font-bold uppercase">
                          {request.business.name}
                        </h3>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                          {request.business.area} · Request #{request.id} · {timeAgo(request.createdAt)}
                        </p>
                      </div>
                      <span
                        className="border px-2 py-1 font-mono text-[10px] uppercase tracking-wider"
                        style={{
                          color: TONE_COLOR[statusMeta.tone],
                          borderColor: TONE_COLOR[statusMeta.tone],
                        }}
                      >
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {request.packages.map((packageId) => {
                        const packageMeta =
                          FIX_PACKAGE_META[packageId as keyof typeof FIX_PACKAGE_META];

                        return (
                          <span
                            key={packageId}
                            className="border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground"
                          >
                            {packageMeta?.label ?? packageId}
                          </span>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs">
                      <span className="text-muted-foreground">
                        Initial estimate: <strong className="text-foreground">{fmtKes(request.totalKes)}</strong>
                      </span>
                      {request.quotedKes !== null && (
                        <span className="text-muted-foreground">
                          GridScout quote: <strong className="text-primary">{fmtKes(request.quotedKes)}</strong>
                        </span>
                      )}
                    </div>

                    {request.note && (
                      <p className="mt-3 border-l-2 border-border pl-3 font-mono text-[11px] text-muted-foreground">
                        Your note: {request.note}
                      </p>
                    )}

                    {request.status === "quoted" && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={acceptQuote.isPending || declineQuote.isPending}
                          onClick={() => acceptQuote.mutate({ requestId: request.id })}
                          className="font-mono text-[10px] uppercase tracking-wider"
                        >
                          {acceptQuote.isPending ? "Processing..." : "Accept quote"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={acceptQuote.isPending || declineQuote.isPending}
                          onClick={() => {
                            if (window.confirm("Decline this GridScout quote?")) {
                              declineQuote.mutate({ requestId: request.id });
                            }
                          }}
                          className="font-mono text-[10px] uppercase tracking-wider"
                        >
                          {declineQuote.isPending ? "Processing..." : "Decline quote"}
                        </Button>
                      </div>
                    )}

                    {(
                      (acceptQuote.isError && acceptQuote.variables?.requestId === request.id) ||
                      (declineQuote.isError && declineQuote.variables?.requestId === request.id)
                    ) && (
                      <p className="mt-2 font-mono text-[10px] text-scout-red">
                        The quote decision could not be saved. Refresh and try again.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="tech-label tech-label--live mb-3">Agency pipeline</div>
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
              Unlocked <span className="text-primary">leads</span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-6 font-mono text-[11px] uppercase tracking-[0.16em]">
            <Stat value={stats.total} label="leads" />
            <Stat value={stats.won} label="won" tone="text-scout-mint" />
            <Stat value={stats.winRate === null ? "—" : `${stats.winRate}%`} label="win rate" />
            <Stat value={fmtCompactKes(stats.fixPipeline)} label="open fix value" tone="text-scout-mint" />
            <Stat value={`${fmtCompactKes(stats.pipeline)}/mo`} label="open leak" tone="text-scout-red" />
          </div>
        </div>

        {/* Toolbar */}
        {!isLoading && !isError && stats.total > 0 && (
          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
              <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" count={stats.total} />
              {LEAD_STATUS_LIST.map((s) => (
                <FilterChip
                  key={s}
                  active={filter === s}
                  onClick={() => setFilter(s)}
                  label={LEAD_STATUS_META[s].label}
                  count={counts[s]}
                  color={TONE_COLOR[LEAD_STATUS_META[s].tone]}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, area, phone, category…"
                aria-label="Search leads"
                className="min-w-0 flex-1 border border-border bg-secondary px-3 py-2 font-mono text-[11px] tracking-wider text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                aria-label="Sort leads"
                className="cursor-pointer border border-border bg-secondary px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-foreground outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="value">Highest value</option>
                <option value="newest">Newest first</option>
              </select>
            </div>
          </div>
        )}

        {setStatus.isError && (
          <div
            role="alert"
            className="mb-4 flex items-center justify-between gap-3 border border-scout-red/60 bg-scout-red/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-scout-red"
          >
            <span>Update failed. {setStatus.error.message}</span>
            <button onClick={() => setStatus.reset()} className="cursor-pointer underline">
              dismiss
            </button>
          </div>
        )}

        {isLoading && (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse bg-secondary/50" />
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center gap-4 border border-dashed border-scout-red/50 py-16 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-scout-red">Could not load leads</p>
            <button
              onClick={() => refetch()}
              className="cursor-pointer border border-primary px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && stats.total === 0 && (
          <div className="flex flex-col items-center gap-4 border border-dashed border-border py-20 text-center">
            <div className="radar-sweep h-16 w-16 rounded-full border border-border" />
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              No unlocked leads yet
            </p>
            <Link
              to="/app"
              className="border border-primary/50 px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Run a scan →
            </Link>
          </div>
        )}

        {!isLoading && !isError && stats.total > 0 && visible.length === 0 && (
          <div className="border border-dashed border-border p-10 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            No leads match this filter.
          </div>
        )}

        <div className="space-y-2">
          {visible.map((lead) => {
            const b = lead.business;
            const meta = LEAD_STATUS_META[lead.status];
            const color = TONE_COLOR[meta.tone];
            const isOpen = expanded === lead.id;
            const rowPending = setStatus.isPending && setStatus.variables?.leadId === lead.id;
            const draft = noteDrafts[lead.id];
            const currentNotes = lead.notes ?? "";
            const dirty = draft !== undefined && draft !== currentNotes;
            const site = b.website ? parseWebsite(b.website) : null;
            const options: LeadStatus[] = [lead.status, ...meta.next];

            // Estimated plan from the score band; the console shows the exact plan from live signals
            const plan = bandPlan(b.scores.visibility);
            const planValue = fixValueKes(b.scores.visibility);
            const quote = buildQuoteText(
              { name: b.name, visibility: b.scores.visibility, lostRevenueKes: b.lostRevenueKes },
              plan,
            );
            const ownerHref = `https://wa.me/${b.phone.replace(/\D/g, "")}?text=${encodeURIComponent(quote)}`;

            return (
              <div key={lead.id} className="border border-border bg-card">
                <div className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-secondary/40">
                  <button
                    onClick={() => setExpanded(isOpen ? null : lead.id)}
                    aria-expanded={isOpen}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left"
                  >
                    <span className="inline-block h-2.5 w-2.5 shrink-0 rotate-45" style={{ background: color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{b.name}</span>
                      <span className="block truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {CATEGORY_META[b.category].label} · {b.area} ·{" "}
                        <span className="text-foreground/80">{b.phone}</span>
                        {" · "}
                        {timeAgo(lead.createdAt)}
                      </span>
                    </span>
                    <span className="hidden font-mono text-[11px] sm:block" style={{ color: scoreColor(b.scores.visibility) }}>
                      VIS {b.scores.visibility}
                    </span>
                    {planValue > 0 && (
                      <span className="hidden font-mono text-[10px] uppercase tracking-wider text-scout-mint md:block">
                        fix {fmtCompactKes(planValue)}
                      </span>
                    )}
                    <span className="font-display text-sm font-bold text-scout-red">
                      {fmtCompactKes(b.lostRevenueKes)}
                      <span className="font-mono text-[9px] font-normal text-muted-foreground">/mo</span>
                    </span>
                  </button>

                  <select
                    value={lead.status}
                    disabled={rowPending || meta.next.length === 0}
                    aria-label={`Status for ${b.name}`}
                    onChange={(e) =>
                      setStatus.mutate({ leadId: lead.id, status: e.target.value as LeadStatus })
                    }
                    className="cursor-pointer border border-border bg-secondary px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest text-foreground outline-none focus:ring-1 focus:ring-primary disabled:cursor-default disabled:opacity-60"
                    style={{ borderLeft: `3px solid ${color}` }}
                  >
                    {options.map((s) => (
                      <option key={s} value={s}>
                        {LEAD_STATUS_META[s].label}
                      </option>
                    ))}
                  </select>
                </div>

                {isOpen && (
                  <div className="hairline-t grid gap-4 p-4 md:grid-cols-2">
                    <div className="space-y-4">
                      {/* Fix plan + monetisation */}
                      <div>
                        <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          <span>Fix plan (estimate)</span>
                          {planValue > 0 && <span className="text-scout-mint">{fmtKes(planValue)}</span>}
                        </div>
                        {plan.length === 0 ? (
                          <div className="border-l-2 border-scout-mint bg-secondary/40 py-1.5 pl-3 font-mono text-[11px] text-scout-mint">
                            Healthy profile. Pitch monitoring instead.
                          </div>
                        ) : (
                          <>
                            <ul className="space-y-1">
                              {plan.map((id) => (
                                <li
                                  key={id}
                                  className="flex justify-between gap-3 border-l-2 border-scout-mint bg-secondary/40 py-1 pl-3 pr-2 font-mono text-[11px] text-foreground/90"
                                >
                                  <span>{FIX_PACKAGE_META[id].label}</span>
                                  <span className="shrink-0 text-scout-mint">{fmtKes(FIX_PACKAGE_META[id].priceKes)}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-wider">
                              <a
                                href={ownerHref}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="border border-primary/50 bg-primary/10 px-3 py-1.5 text-primary hover:bg-primary hover:text-primary-foreground"
                              >
                                Send quote
                              </a>
                              <button
                                onClick={() =>
                                  copyText(
                                    quote,
                                    () => setCopiedQuoteId(lead.id),
                                    () => setCopiedQuoteId((c) => (c === lead.id ? null : c)),
                                  )
                                }
                                className="cursor-pointer border border-border px-3 py-1.5 text-muted-foreground hover:border-primary/50 hover:text-primary"
                              >
                                {copiedQuoteId === lead.id ? "Copied ✓" : "Copy quote"}
                              </button>
                            </div>
                            <p className="mt-2 font-mono text-[9px] normal-case tracking-wide text-muted-foreground/70">
                              Estimated from the visibility band. Open the audit in the console for the exact plan.
                            </p>
                          </>
                        )}
                      </div>

                      {/* Pitch */}
                      <div>
                        <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          <span>Pitch email</span>
                          {lead.pitch && (
                            <button
                              onClick={() =>
                                copyText(
                                  lead.pitch!,
                                  () => setCopiedId(lead.id),
                                  () => setCopiedId((c) => (c === lead.id ? null : c)),
                                )
                              }
                              className="cursor-pointer text-primary hover:underline"
                            >
                              {copiedId === lead.id ? "Copied" : "Copy"}
                            </button>
                          )}
                        </div>
                        {lead.pitch ? (
                          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap border border-border bg-secondary/30 p-3 font-mono text-[11px] leading-relaxed text-foreground/90">
                            {lead.pitch}
                          </pre>
                        ) : (
                          <div className="border border-dashed border-border p-4 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Generate the pitch from the console
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {site ? (
                            <a
                              href={site.href}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="border border-border px-2 py-1 text-primary hover:border-primary/50"
                            >
                              {site.label}
                            </a>
                          ) : (
                            <span className="border border-border px-2 py-1">no website</span>
                          )}
                          <a
                            href={`tel:${b.phone.replace(/[^\d+]/g, "")}`}
                            className="border border-border px-2 py-1 text-primary hover:border-primary/50"
                          >
                            call
                          </a>
                          <a
                            href={`https://wa.me/${b.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="border border-border px-2 py-1 text-primary hover:border-primary/50"
                          >
                            whatsapp
                          </a>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        Field notes {dirty && <span className="text-scout-amber">· unsaved</span>}
                      </div>
                      <Textarea
                        value={draft ?? currentNotes}
                        onChange={(e) => setNoteDrafts((d) => ({ ...d, [lead.id]: e.target.value }))}
                        placeholder="Outcome of the call, objections, next step…"
                        className="min-h-28 border-border bg-secondary/40 font-mono text-xs focus-visible:ring-primary"
                      />
                      <Button
                        variant="outline"
                        disabled={rowPending || !dirty}
                        onClick={() => saveNotes(lead.id, lead.status, draft ?? "")}
                        className="mt-2 cursor-pointer border-border font-mono text-[10px] uppercase tracking-widest text-primary hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                      >
                        {rowPending ? "Saving…" : "Save notes"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {!isAdmin && <StkModal open={checkoutOpen} onOpenChange={setCheckoutOpen} />}
    </div>
  );
}

function Stat({ value, label, tone = "text-foreground" }: { value: React.ReactNode; label: string; tone?: string }) {
  return (
    <div>
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex cursor-pointer items-center gap-2 border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
        active
          ? "border-primary/60 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {color && <span className="inline-block h-1.5 w-1.5 rotate-45" style={{ background: color }} />}
      {label}
      <span className="opacity-60">{count}</span>
    </button>
  );
}