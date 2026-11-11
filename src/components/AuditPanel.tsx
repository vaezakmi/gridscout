import { useId, useState } from "react";
import { trpc } from "@/providers/trpc";
import {
  CATEGORY_META,
  FIX_PACKAGE_META,
  LEAD_STATUS_META,
  buildFixPlan,
  fixPlanTotalKes,
  type AuditDetail,
  type FixPackageId,
  type LeadStatus,
} from "@contracts/grid";
import { fmtKes, scoreColor } from "@/lib/format";
import { FREE_GAPS, buildQuoteText } from "@/lib/opportunity";
import { ScoreRing } from "./ScoreRing";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const NO_CREDITS = "INSUFFICIENT_CREDITS";
const LOCKED_PHONE = "+254 7•• ••• •••"; // placeholder only; the real number never reaches a locked client

const NO_ISSUES: string[] = [];
const NO_COMPETITORS: AuditDetail["competitors"] = [];

interface Props {
  audit: AuditDetail | null | undefined;
  loading: boolean;
  onBuyCredits: () => void;
  onUnlocked: () => void;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  const v = clamp(value);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em]">
        <span className="text-muted-foreground">{label}</span>
        <span style={{ color }}>{v}</span>
      </div>
      <div className="h-1 w-full bg-secondary">
        <div
          className="h-full"
          style={{ width: `${v}%`, background: color, transformOrigin: "left", animation: "bar-fill 0.5s ease-out" }}
        />
      </div>
    </div>
  );
}

function Signal({ label, ok, value }: { label: string; ok: boolean | null; value: string }) {
  const tone = ok === null ? "text-foreground/80" : ok ? "text-scout-mint" : "text-scout-red";
  return (
    <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wider">
      <span className="truncate text-muted-foreground">{label}</span>
      <span className={`shrink-0 ${tone}`}>{value}</span>
    </div>
  );
}

const yesNo = (v: boolean | null) => (v === null ? "n/a" : v ? "yes" : "no");

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="mt-2 border border-scout-red/50 bg-scout-red/10 p-2 font-mono text-[10px] leading-relaxed text-scout-red">
      {children}
    </div>
  );
}

// Normalise a stored website into a safe href + short label for the action row
function siteLink(website: string | null): { href: string; label: string } | null {
  if (!website) return null;
  const href = /^https?:\/\//i.test(website) ? website : `https://${website}`;
  let label = "website";
  try {
    label = new URL(href).hostname.replace(/^www\./, "");
  } catch {
    /* keep default label if the URL can't be parsed */
  }
  return { href, label };
}

// A blurred stand-in row. Never renders real text, so locked content isn't sitting in the DOM.
function LockedRow({ width = "w-3/4" }: { width?: string }) {
  return (
    <li
      aria-hidden="true"
      className="select-none border-l-2 border-border bg-secondary/30 py-1.5 pl-3 pr-2 font-mono text-[11px] text-muted-foreground blur-[3px]"
    >
      <span className={`inline-block h-3 ${width} bg-muted-foreground/30`} />
    </li>
  );
}

function FixPlan({
  audit,
  plan,
  unlocked,
  copiedQuote,
  onCopyQuote,
  onUnlockClick,
}: {
  audit: AuditDetail;
  plan: FixPackageId[];
  unlocked: boolean;
  copiedQuote: boolean;
  onCopyQuote: () => void;
  onUnlockClick: () => void;
}) {
  const [requestNote, setRequestNote] = useState("");
  const requestNoteId = useId();
  const utils = trpc.useUtils();

  const requestFix = trpc.fixes.request.useMutation({
    onSuccess: () => {
      setRequestNote("");
      void utils.fixes.mine.invalidate();
    },
  });

  const total = fixPlanTotalKes(plan);
  const quote = buildQuoteText(
    { name: audit.name, visibility: audit.scores.visibility, lostRevenueKes: audit.lostRevenueKes },
    plan,
  );
  const ownerHref = `https://wa.me/${audit.phone.replace(/\D/g, "")}?text=${encodeURIComponent(quote)}`;
  const monthsOfLeak = audit.lostRevenueKes > 0 ? total / audit.lostRevenueKes : null;

  return (
    <div className="hairline-b p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Fix plan</span>
        {plan.length > 0 && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-scout-mint">worth {fmtKes(total)}</span>
        )}
      </div>

      {plan.length === 0 ? (
        <div className="border-l-2 border-scout-mint bg-secondary/40 py-1.5 pl-3 font-mono text-[11px] text-scout-mint">
          Nothing urgent to fix. Pitch monitoring instead.
        </div>
      ) : !unlocked ? (
        <>
          <p className="mb-2 font-mono text-[11px] leading-relaxed text-foreground/90">
            {plan.length} fix{plan.length === 1 ? "" : "es"} ready to sell, worth {fmtKes(total)}.
          </p>
          <ul className="space-y-1.5">
            {plan.slice(0, 3).map((id, i) => (
              <LockedRow key={id} width={i === 0 ? "w-4/5" : i === 1 ? "w-2/3" : "w-3/5"} />
            ))}
          </ul>
          <button
            onClick={onUnlockClick}
            className="mt-3 cursor-pointer font-mono text-[10px] uppercase tracking-widest text-primary underline-offset-4 hover:underline"
          >
            Unlock to see the itemised plan, send quotes and request delivery
          </button>
        </>
      ) : (
        <>
          <ul className="space-y-1.5">
            {plan.map((id) => {
              const p = FIX_PACKAGE_META[id];
              return (
                <li key={id} className="border-l-2 border-scout-mint bg-secondary/40 py-1.5 pl-3 pr-2">
                  <div className="flex items-start justify-between gap-3 font-mono text-[11px] text-foreground/90">
                    <span>{p.label}</span>
                    <span className="shrink-0 text-scout-mint">{fmtKes(p.priceKes)}</span>
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
                    {p.blurb} · {p.timeline}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="hairline-t mt-3 flex items-end justify-between pt-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Total fix plan</div>
              <div className="font-display text-xl font-bold text-scout-mint">{fmtKes(total)}</div>
            </div>
            {monthsOfLeak !== null && (
              <div className="text-right font-mono text-[10px] uppercase leading-relaxed tracking-wider text-muted-foreground">
                about {monthsOfLeak < 1 ? "less than 1" : monthsOfLeak.toFixed(1)} month{monthsOfLeak === 1 ? "" : "s"}
                <br />
                of the monthly leak
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-wider">
            <a
              href={ownerHref}
              target="_blank"
              rel="noreferrer noopener"
              className="border border-primary/50 bg-primary/10 px-3 py-1.5 text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Send quote on WhatsApp
            </a>
            <button
              onClick={onCopyQuote}
              className="cursor-pointer border border-border px-3 py-1.5 text-muted-foreground hover:border-primary/50 hover:text-primary"
            >
              {copiedQuote ? "Copied ✓" : "Copy quote"}
            </button>
          </div>

          <div className="mt-3 border border-scout-orange/40 bg-scout-orange/5 p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-scout-orange">Done-for-you</div>
            <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted-foreground">
              Can’t deliver the fixes yourself? GridScout’s team does the work. You keep the client and the margin.
            </p>
            <div className="mt-3 space-y-2">
  <label
    htmlFor={requestNoteId}
    className="block font-mono text-[9px] uppercase tracking-widest text-muted-foreground"
  >
    Additional instructions (optional)
  </label>

  <textarea
    id={requestNoteId}
    value={requestNote}
    onChange={(event) => setRequestNote(event.target.value)}
    maxLength={500}
    rows={2}
    placeholder="Tell us about the work or client requirements..."
    className="w-full resize-y border border-border bg-secondary/40 p-2 font-mono text-[10px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
  />

  <button
    type="button"
    disabled={audit.leadId === null || requestFix.isPending || plan.length === 0}
    onClick={() => {
      if (audit.leadId === null) return;

      requestFix.mutate({
        leadId: audit.leadId,
        packages: plan,
        note: requestNote.trim() || undefined,
      });
    }}
    className="w-full cursor-pointer bg-scout-orange px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-50"
  >
    {requestFix.isPending ? "Submitting request..." : "Request GridScout fulfilment"}
  </button>

  {requestFix.isSuccess && (
    <p role="status" className="font-mono text-[10px] text-scout-mint">
      Request submitted. GridScout will review the work and prepare a quote.
    </p>
  )}

  {requestFix.isError && (
    <p role="alert" className="font-mono text-[10px] text-scout-red">
      Request failed: {requestFix.error.message}
    </p>
  )}

  <p className="font-mono text-[9px] leading-relaxed text-muted-foreground/70">
    No credits are deducted when you submit a request. Work begins only after you review and accept the quote.
  </p>
</div>
          </div>
        </>
      )}
    </div>
  );
}

// Remounts per business so mutation state (pitch, errors) can never leak between targets
export function AuditPanel(props: Props) {
  return <AuditPanelInner key={props.audit?.id ?? "none"} {...props} />;
}

function AuditPanelInner({ audit, loading, onBuyCredits, onUnlocked }: Props) {
  const [copied, setCopied] = useState(false);
  const [copiedQuote, setCopiedQuote] = useState(false);
  const { data: wallet } = trpc.payments.wallet.useQuery();

  const unlock = trpc.leads.unlock.useMutation({
    onSuccess: () => onUnlocked(),
    onError: (e) => {
      if (e.message.includes(NO_CREDITS)) onBuyCredits();
    },
  });
  const genPitch = trpc.leads.generatePitch.useMutation({ onSuccess: () => onUnlocked() });
  const setStatus = trpc.leads.setStatus.useMutation({ onSuccess: () => onUnlocked() });

  if (loading) {
    return (
      <div className="space-y-4 p-4" aria-busy="true">
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
  const pitch = genPitch.data?.pitch ?? audit.pitch;
  const credits = wallet?.credits;
  const broke = credits !== undefined && credits < 1;
  const rank = audit.keywordRank;
  const site = siteLink(audit.website);

  const gaps = audit.issues ?? NO_ISSUES;
  const shownGaps = unlocked ? gaps : gaps.slice(0, FREE_GAPS);
  const hiddenGaps = unlocked ? 0 : Math.max(0, gaps.length - FREE_GAPS);

  const fixPlan = buildFixPlan(audit);

  const statusOptions: LeadStatus[] = audit.leadStatus
    ? [audit.leadStatus, ...LEAD_STATUS_META[audit.leadStatus].next]
    : [];

  const copyPitch = async () => {
    if (!pitch) return;
    try {
      await navigator.clipboard.writeText(pitch);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked; the pitch is still selectable in the box */
    }
  };

  const copyQuote = async () => {
    try {
      await navigator.clipboard.writeText(
        buildQuoteText(
          { name: audit.name, visibility: audit.scores.visibility, lostRevenueKes: audit.lostRevenueKes },
          fixPlan,
        ),
      );
      setCopiedQuote(true);
      setTimeout(() => setCopiedQuote(false), 1600);
    } catch {
      /* clipboard blocked; the WhatsApp button still carries the full text */
    }
  };

  const onUnlockClick = () => {
    if (broke) return onBuyCredits();
    unlock.mutate({ businessId: audit.id });
  };

  const unlockFailed = unlock.isError && !unlock.error.message.includes(NO_CREDITS);

  return (
    <div className="flex h-full flex-col">
      <div className="hairline-b space-y-3 p-4">
        <div>
          <div className="tech-label mb-2">
            {CATEGORY_META[audit.category].label} · {audit.area}
          </div>
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
            <div className="font-display text-2xl font-bold text-scout-red">{fmtKes(audit.lostRevenueKes)}</div>
          </div>
          <div className="text-right font-mono text-[10px] uppercase leading-relaxed tracking-wider text-muted-foreground">
            <div>{audit.estSearches.toLocaleString()} searches/mo</div>
            <div>ticket {fmtKes(audit.avgTicketKes)}</div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Gaps: a free preview, the rest behind the unlock */}
        <div className="hairline-b p-4">
          <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span>Detected gaps</span>
            {gaps.length > 0 && <span className="text-scout-amber">{gaps.length} found</span>}
          </div>
          <ul className="space-y-1.5">
            {shownGaps.map((issue, i) => (
              <li
                key={`${i}-${issue}`}
                className="border-l-2 border-scout-amber bg-secondary/40 py-1.5 pl-3 pr-2 font-mono text-[11px] leading-relaxed text-foreground/90"
              >
                {issue}
              </li>
            ))}
            {Array.from({ length: Math.min(hiddenGaps, 3) }, (_, i) => (
              <LockedRow key={`locked-${i}`} width={i === 0 ? "w-5/6" : i === 1 ? "w-2/3" : "w-3/5"} />
            ))}
            {gaps.length === 0 && (
              <li className="border-l-2 border-scout-mint bg-secondary/40 py-1.5 pl-3 font-mono text-[11px] text-scout-mint">
                No critical gaps detected. Profile is strong
              </li>
            )}
          </ul>
          {hiddenGaps > 0 && (
            <button
              onClick={onUnlockClick}
              className="mt-2 cursor-pointer font-mono text-[10px] uppercase tracking-widest text-primary underline-offset-4 hover:underline"
            >
              {hiddenGaps} more gap{hiddenGaps === 1 ? "" : "s"} hidden. Unlock lead
            </button>
          )}
        </div>

        {/* Fix plan: what the agency can sell */}
        <FixPlan
          audit={audit}
          plan={fixPlan}
          unlocked={unlocked}
          copiedQuote={copiedQuote}
          onCopyQuote={copyQuote}
          onUnlockClick={onUnlockClick}
        />

        {/* Profile signals: the detail behind the gaps, unlocked only */}
        {unlocked && (
          <div className="hairline-b p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Profile signals
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
              <Signal label="Claimed profile" ok={audit.claimed} value={yesNo(audit.claimed)} />
              <Signal
                label="Local rank"
                ok={rank === null ? false : rank <= 3}
                value={rank === null ? "not ranking" : `#${rank}`}
              />
              <Signal label="Rating" ok={null} value={`${audit.rating.toFixed(1)}★ · ${audit.reviewCount}`} />
              <Signal label="Replies to reviews" ok={audit.respondsToReviews} value={yesNo(audit.respondsToReviews)} />
              <Signal label="Photos" ok={audit.photos > 0} value={String(audit.photos)} />
              <Signal label="Posts" ok={audit.posts > 0} value={String(audit.posts)} />
              {audit.website === null ? (
                <Signal label="Website" ok={false} value="none" />
              ) : (
                <>
                  <Signal label="Mobile-friendly" ok={audit.mobileOk} value={yesNo(audit.mobileOk)} />
                  <Signal label="Meta tags" ok={audit.metaOk} value={yesNo(audit.metaOk)} />
                  <Signal label="Site speed" ok={null} value={audit.siteSpeed === null ? "n/a" : String(audit.siteSpeed)} />
                </>
              )}
            </div>
          </div>
        )}

        {/* Competitors: the hook, always visible */}
        <div className="hairline-b p-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Who is winning instead: “{kw}”
          </div>
          <ul className="space-y-1.5">
            {(audit.competitors ?? NO_COMPETITORS).map((c) => (
              <li key={c.id} className="flex items-center gap-3 font-mono text-[11px]">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: scoreColor(c.visibilityScore) }}
                />
                <span className="min-w-0 flex-1 truncate text-foreground/90">{c.name}</span>
                <span className="text-muted-foreground">{c.distanceKm.toFixed(1)}km</span>
                <span className="w-6 text-right text-muted-foreground">{c.keywordRank ? `#${c.keywordRank}` : "—"}</span>
                <span style={{ color: scoreColor(c.visibilityScore) }} className="w-7 text-right font-bold">
                  {c.visibilityScore}
                </span>
              </li>
            ))}
            {(audit.competitors ?? NO_COMPETITORS).length === 0 && (
              <li className="font-mono text-[11px] text-muted-foreground">No competitors indexed in this sector.</li>
            )}
          </ul>
        </div>

        {/* Contact / unlock zone */}
        <div className="p-4">
          {!unlocked ? (
            <div className="relative overflow-hidden border border-border">
              <div className="select-none space-y-2 p-4 blur-sm" aria-hidden="true">
                <div className="font-mono text-sm font-bold text-foreground">{LOCKED_PHONE}</div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  {audit.website ? "website on record" : "no website on record"}
                </div>
                <div className="h-16 bg-secondary/60" />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/40 p-3">
                <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Unlock: full gaps, fix plan, contact
                </p>
                <Button
                  onClick={onUnlockClick}
                  disabled={unlock.isPending}
                  className="bg-primary font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground hover:bg-primary/85"
                >
                  {unlock.isPending ? "Unlocking…" : broke ? "Buy credits to unlock" : "Unlock lead · 1 credit"}
                </Button>
                {credits !== undefined && (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    balance {credits} credit{credits === 1 ? "" : "s"}
                  </span>
                )}
                <button
                  onClick={onBuyCredits}
                  className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  Buy credits via M-Pesa
                </button>
                {unlockFailed && <ErrorNote>Unlock failed. {unlock.error?.message}</ErrorNote>}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border border-scout-mint/40 bg-scout-mint/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-scout-mint">Lead unlocked</span>
                  <select
                    value={audit.leadStatus ?? "new"}
                    aria-label="Lead status"
                    disabled={setStatus.isPending || statusOptions.length <= 1}
                    onChange={(e) =>
                      audit.leadId !== null &&
                      setStatus.mutate({ leadId: audit.leadId, status: e.target.value as LeadStatus })
                    }
                    className="cursor-pointer border border-border bg-secondary px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-foreground outline-none focus:ring-1 focus:ring-primary disabled:cursor-default disabled:opacity-60"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {LEAD_STATUS_META[s].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 font-mono text-sm font-bold text-foreground">{audit.phone}</div>
                <div className="mt-2 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-wider">
                  <a
                    href={`tel:${audit.phone.replace(/[^\d+]/g, "")}`}
                    className="border border-border px-2 py-1 text-primary hover:border-primary/50"
                  >
                    call
                  </a>
                  <a
                    href={`https://wa.me/${audit.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="border border-border px-2 py-1 text-primary hover:border-primary/50"
                  >
                    whatsapp
                  </a>
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
                    <span className="border border-border px-2 py-1 text-muted-foreground">no website</span>
                  )}
                </div>
                {setStatus.isError && <ErrorNote>Status update failed. {setStatus.error?.message}</ErrorNote>}
              </div>

              {/* AI pitch */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    AI cold-pitch
                  </span>
                  {pitch && !genPitch.isPending && (
                    <span className="flex gap-3 font-mono text-[10px] uppercase tracking-widest">
                      <button
                        onClick={() => audit.leadId !== null && genPitch.mutate({ leadId: audit.leadId })}
                        className="cursor-pointer text-muted-foreground hover:text-primary"
                      >
                        Regenerate
                      </button>
                      <button onClick={copyPitch} className="cursor-pointer text-primary underline-offset-4 hover:underline">
                        {copied ? "Copied ✓" : "Copy"}
                      </button>
                    </span>
                  )}
                </div>

                {genPitch.isPending ? (
                  <div className="space-y-2 border border-border bg-secondary/30 p-3">
                    <Skeleton className="h-3 w-full bg-secondary" />
                    <Skeleton className="h-3 w-5/6 bg-secondary" />
                    <Skeleton className="h-3 w-4/6 bg-secondary" />
                    <div className="pt-1 font-mono text-[10px] uppercase tracking-widest text-primary">Drafting pitch…</div>
                  </div>
                ) : pitch ? (
                  <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap border border-border bg-secondary/30 p-3 font-mono text-[11px] leading-relaxed text-foreground/90">
                    {pitch}
                  </pre>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => audit.leadId !== null && genPitch.mutate({ leadId: audit.leadId })}
                    className="w-full cursor-pointer border-primary/40 bg-transparent font-mono text-[11px] uppercase tracking-[0.16em] text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    Generate pitch with AI
                  </Button>
                )}

                {genPitch.isError && <ErrorNote>Could not draft the pitch. {genPitch.error?.message}</ErrorNote>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}