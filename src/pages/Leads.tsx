import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { CATEGORY_META, LEAD_STATUS_LIST, type LeadStatus } from "@contracts/grid";
import { fmtCompactKes, scoreColor } from "@/lib/format";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { StkModal } from "@/components/StkModal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const STATUS_STYLE: Record<LeadStatus, { color: string; label: string }> = {
  new: { color: "hsl(var(--primary))", label: "New" },
  contacted: { color: "hsl(var(--scout-amber))", label: "Contacted" },
  replied: { color: "hsl(var(--scout-magenta))", label: "Replied" },
  won: { color: "hsl(var(--scout-mint))", label: "Won" },
  lost: { color: "hsl(var(--scout-red))", label: "Lost" },
};

export default function Leads() {
  useAuth({ redirectOnUnauthenticated: true });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});

  const { data: leads, isLoading } = trpc.leads.list.useQuery();
  const utils = trpc.useUtils();
  const setStatus = trpc.leads.setStatus.useMutation({
    onSuccess: () => utils.leads.list.invalidate(),
  });

  const total = leads?.length ?? 0;
  const won = leads?.filter((l) => l.status === "won").length ?? 0;
  const pipelineValue =
    leads?.filter((l) => l.status !== "lost" && l.status !== "won")
      .reduce((s, l) => s + l.business.lostRevenueKes, 0) ?? 0;

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
          <div className="flex gap-6 font-mono text-[11px] uppercase tracking-[0.16em]">
            <div>
              <div className="text-2xl font-bold text-foreground">{total}</div>
              <div className="text-muted-foreground">leads</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-scout-mint">{won}</div>
              <div className="text-muted-foreground">won</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-scout-red">{fmtCompactKes(pipelineValue)}</div>
              <div className="text-muted-foreground">pipeline value</div>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse bg-secondary/50" />
            ))}
          </div>
        )}

        {!isLoading && (leads?.length ?? 0) === 0 && (
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

        <div className="space-y-2">
          {leads?.map((lead) => {
            const b = lead.business;
            const style = STATUS_STYLE[lead.status];
            const isOpen = expanded === lead.id;
            return (
              <div key={lead.id} className="border border-border bg-card">
                <button
                  onClick={() => setExpanded(isOpen ? null : lead.id)}
                  className="flex w-full cursor-pointer flex-wrap items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-secondary/40"
                >
                  <span className="inline-block h-2.5 w-2.5 shrink-0 rotate-45" style={{ background: style.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{b.name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {CATEGORY_META[b.category].label} · {b.area} ·{" "}
                      <span className="text-foreground/80">{b.phone}</span>
                    </div>
                  </div>
                  <div className="hidden font-mono text-[11px] text-muted-foreground sm:block">
                    <span style={{ color: scoreColor(b.scores.visibility) }}>VIS {b.scores.visibility}</span>
                  </div>
                  <div className="font-display text-sm font-bold text-scout-red">
                    {fmtCompactKes(b.lostRevenueKes)}<span className="font-mono text-[9px] font-normal text-muted-foreground">/mo</span>
                  </div>
                  <select
                    value={lead.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      setStatus.mutate({
                        leadId: lead.id,
                        status: e.target.value as LeadStatus,
                      })
                    }
                    className="cursor-pointer border border-border bg-secondary px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest text-foreground outline-none focus:ring-1 focus:ring-primary"
                  >
                    {LEAD_STATUS_LIST.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_STYLE[s].label}
                      </option>
                    ))}
                  </select>
                </button>

                {isOpen && (
                  <div className="hairline-t grid gap-4 p-4 md:grid-cols-2">
                    <div>
                      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        Pitch email
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
                        {b.website ? (
                          <a href={b.website} target="_blank" rel="noreferrer" className="border border-border px-2 py-1 text-primary hover:border-primary/50">
                            {b.website.replace("https://", "")}
                          </a>
                        ) : (
                          <span className="border border-border px-2 py-1">no website</span>
                        )}
                        <a href={`tel:${b.phone.replace(/\s/g, "")}`} className="border border-border px-2 py-1 text-primary hover:border-primary/50">
                          call
                        </a>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        Field notes
                      </div>
                      <Textarea
                        value={noteDrafts[lead.id] ?? lead.notes ?? ""}
                        onChange={(e) =>
                          setNoteDrafts((d) => ({ ...d, [lead.id]: e.target.value }))
                        }
                        placeholder="Outcome of the call, objections, next step…"
                        className="min-h-28 border-border bg-secondary/40 font-mono text-xs focus-visible:ring-primary"
                      />
                      <Button
                        variant="outline"
                        disabled={setStatus.isPending || (noteDrafts[lead.id] ?? lead.notes ?? "") === (lead.notes ?? "")}
                        onClick={() =>
                          setStatus.mutate({
                            leadId: lead.id,
                            status: lead.status,
                            notes: noteDrafts[lead.id] ?? "",
                          })
                        }
                        className="mt-2 cursor-pointer border-border font-mono text-[10px] uppercase tracking-widest text-primary hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                      >
                        Save notes
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
