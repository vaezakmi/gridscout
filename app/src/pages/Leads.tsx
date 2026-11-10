import { useMemo, useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import {
  CATEGORY_META,
  LEAD_STATUS_LIST,
  LEAD_STATUS_META,
  type LeadStatus,
  type Tone,
} from "@contracts/grid";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { StkModal } from "@/components/StkModal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fmtCompactKes, scoreColor } from "@/lib/format";

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
  useAuth({ redirectOnUnauthenticated: true });

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("value");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data: leads, isLoading, isError, refetch } = trpc.leads.list.useQuery();
  const utils = trpc.useUtils();
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
    return {
      total: list.length,
      won: counts.won,
      winRate: closed === 0 ? null : Math.round((counts.won / closed) * 100),
      pipeline: list
        .filter((l) => ACTIVE_STATUSES.includes(l.status))
        .reduce((s, l) => s + l.business.lostRevenueKes, 0),
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

  const copyPitch = async (id: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch {
      /* clipboard blocked; the pitch is still selectable in the box */
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
      <ConsoleHeader onBuyCredits={() => setCheckoutOpen(true)} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
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
            <Stat
              value={stats.winRate === null ? "—" : `${stats.winRate}%`}
              label="win rate"
            />
            <Stat value={`${fmtCompactKes(stats.pipeline)}/mo`} label="open pipeline" tone="text-scout-red" />
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
            // Only the current status plus the transitions the contract allows
            const options: LeadStatus[] = [lead.status, ...meta.next];

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
                    <div>
                      <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        <span>Pitch email</span>
                        {lead.pitch && (
                          <button
                            onClick={() => copyPitch(lead.id, lead.pitch!)}
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

      <StkModal open={checkoutOpen} onOpenChange={setCheckoutOpen} />
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