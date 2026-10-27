import { useState } from "react";
import { trpc } from "@/providers/trpc";
import type { AuditDetail } from "@contracts/grid";
import { CATEGORY_META, LEAD_STATUS_LIST } from "@contracts/grid";
import { fmtKes, scoreColor } from "@/lib/format";
import { ScoreRing } from "./ScoreRing";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  replied: "Replied",
  won: "Won",
  lost: "Lost",
};

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em]">
        <span className="text-muted-foreground">{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div className="h-1 w-full bg-secondary">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${value}%`, background: color, transformOrigin: "left", animation: "bar-fill 0.5s ease-out" }}
        />
      </div>
    </div>
  );
}

export function AuditPanel({
  audit,
  loading,
  onBuyCredits,
  onUnlocked,
}: {
  audit: AuditDetail | null | undefined;
  loading: boolean;
  onBuyCredits: () => void;
  onUnlocked: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const unlock = trpc.leads.unlock.useMutation();
  const genPitch = trpc.leads.generatePitch.useMutation({
    onSuccess: () => onUnlocked(),
  });
  const setStatus = trpc.leads.setStatus.useMutation({ onSuccess: () => onUnlocked() });

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-6 w-3/4 bg-secondary" />
        <Skeleton className="h-24 w-full bg-secondary" />
        <Skeleton className="h-40 w-full bg-secondary" />
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="radar-sweep h-16 w-16 rounded-full border border-border" />
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Select a target on the grid
          <br />
          or run a scan
        </p>
      </div>
    );
  }

  const unlocked = audit.leadStatus !== null;
  const kw = CATEGORY_META[audit.category].keyword;

  const copyPitch = () => {
    if (!audit.leadId) return;
    const lead = genPitch.data?.pitch;
    if (!lead) return;
    navigator.clipboard.writeText(lead).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="hairline-b space-y-3 p-4">
        <div>
          <div className="tech-label mb-2">{CATEGORY_META[audit.category].label} · {audit.area}</div>
          <h2 className="font-display text-lg font-bold leading-tight">{audit.name}</h2>
        </div>

        <div className="flex items-center gap-4">
          <ScoreRing score={audit.scores.visibility} />
          <div className="flex-1 space-y-2.5">
            <Bar label="Maps presence" value={audit.scores.maps} color={scoreColor(audit.scores.maps)} />
            <Bar label="Web presence" value={audit.scores.web} color={scoreColor(audit.scores.web)} />
          </div>
        </div>

        <div className="hairline-t flex items-end justify-between pt-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Revenue leaking / month
            </div>
            <div className="font-display text-2xl font-bold text-scout-red">
              {fmtKes(audit.lostRevenueKes)}
            </div>
          </div>
          <div className="text-right font-mono text-[10px] uppercase leading-relaxed tracking-wider text-muted-foreground">
            <div>{audit.estSearches.toLocaleString()} searches/mo</div>
            <div>ticket {fmtKes(audit.avgTicketKes)}</div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Issues */}
        <div className="hairline-b p-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Detected leaks
          </div>
          <ul className="space-y-1.5">
            {audit.issues.map((issue) => (
              <li
                key={issue}
                className="border-l-2 border-scout-amber bg-secondary/40 py-1.5 pl-3 pr-2 font-mono text-[11px] leading-relaxed text-foreground/90"
              >
                {issue}
              </li>
            ))}
            {audit.issues.length === 0 && (
              <li className="border-l-2 border-scout-mint bg-secondary/40 py-1.5 pl-3 font-mono text-[11px] text-scout-mint">
                No critical leaks detected — profile is strong
              </li>
            )}
          </ul>
        </div>

        {/* Competitors */}
        <div className="hairline-b p-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Who is winning instead — “{kw}”
          </div>
          <ul className="space-y-1.5">
            {audit.competitors.map((c) => (
              <li key={c.id} className="flex items-center gap-3 font-mono text-[11px]">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: scoreColor(c.visibilityScore) }}
                />
                <span className="min-w-0 flex-1 truncate text-foreground/90">{c.name}</span>
                <span className="text-muted-foreground">{c.distanceKm}km</span>
                <span style={{ color: scoreColor(c.visibilityScore) }} className="w-7 text-right font-bold">
                  {c.visibilityScore}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact / unlock zone */}
        <div className="p-4">
          {!unlocked ? (
            <div className="relative overflow-hidden border border-border">
              <div className="space-y-2 p-4 blur-sm select-none" aria-hidden="true">
                <div className="font-mono text-sm font-bold text-foreground">{audit.phone}</div>
                <div className="font-mono text-[11px] text-muted-foreground">{audit.website ?? "no website on record"}</div>
                <div className="h-16 bg-secondary/60" />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/40">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Encrypted — unlock this lead
                </p>
                <Button
                  onClick={() =>
                    unlock.mutate(
                      { businessId: audit.id },
                      { onSuccess: () => onUnlocked(), onError: (e) => e.message === "INSUFFICIENT_CREDITS" && onBuyCredits() }
                    )
                  }
                  disabled={unlock.isPending}
                  className="bg-primary font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground hover:bg-primary/85"
                >
                  {unlock.isPending ? "Unlocking…" : "Unlock lead — 1 credit"}
                </Button>
                <button onClick={onBuyCredits} className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
                  Buy credits via M-Pesa
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border border-scout-mint/40 bg-scout-mint/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-scout-mint">Lead unlocked</span>
                  <select
                    value={audit.leadStatus ?? "new"}
                    onChange={(e) =>
                      audit.leadId &&
                      setStatus.mutate({ leadId: audit.leadId, status: e.target.value as import("@contracts/grid").LeadStatus })
                    }
                    className="cursor-pointer border border-border bg-secondary px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-foreground outline-none focus:ring-1 focus:ring-primary"
                  >
                    {LEAD_STATUS_LIST.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 font-mono text-sm font-bold text-foreground">{audit.phone}</div>
                <div className="font-mono text-[11px] text-muted-foreground">{audit.website ?? "no website on record"}</div>
              </div>

              {/* AI pitch */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    AI cold-pitch
                  </span>
                  {genPitch.data?.pitch && (
                    <button
                      onClick={copyPitch}
                      className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-primary hover:underline underline-offset-4"
                    >
                      {copied ? "Copied ✓" : "Copy"}
                    </button>
                  )}
                </div>

                {genPitch.isPending ? (
                  <div className="space-y-2 border border-border bg-secondary/30 p-3">
                    <Skeleton className="h-3 w-full bg-secondary" />
                    <Skeleton className="h-3 w-5/6 bg-secondary" />
                    <Skeleton className="h-3 w-4/6 bg-secondary" />
                    <div className="pt-1 font-mono text-[10px] uppercase tracking-widest text-primary">
                      Drafting pitch…
                    </div>
                  </div>
                ) : genPitch.data?.pitch ? (
                  <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap border border-border bg-secondary/30 p-3 font-mono text-[11px] leading-relaxed text-foreground/90">
                    {genPitch.data.pitch}
                  </pre>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => audit.leadId && genPitch.mutate({ leadId: audit.leadId })}
                    disabled={genPitch.isPending}
                    className="w-full cursor-pointer border-primary/40 bg-transparent font-mono text-[11px] uppercase tracking-[0.16em] text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    Generate pitch with AI
                  </Button>
                )}

                {genPitch.data?.degraded && genPitch.data.errorMessage && (
                  <div className="mt-2 border border-scout-amber/40 bg-scout-amber/10 p-2 font-mono text-[10px] leading-relaxed text-scout-amber">
                    {genPitch.data.errorMessage}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
