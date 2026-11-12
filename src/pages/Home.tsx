import { useState } from "react";
import { CREDIT_PRICE_KES } from "@contracts/grid";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { fmtCompactKes } from "@/lib/format";
import { fixValueKes } from "@/lib/opportunity";
import { RadarLogo } from "@/components/RadarLogo";
import { Ticker } from "@/components/Ticker";

const NAV = [
  ["#loop", "The loop"],
  ["#earn", "Ways to earn"],
  ["#toolkit", "Toolkit"],
  ["#roi", "ROI"],
  ["#pricing", "Pricing"],
];

const LOOP = [
  {
    n: "01",
    t: "Find",
    d: "Sweep a sector grid by grid. Every business scored 0–100 on Maps and web presence, with the monthly opportunity estimate in KES and the top gaps shown free.",
  },
  {
    n: "02",
    t: "Fix",
    d: "Unlock a lead to reveal its full gap list, contact details and itemised fix plan. Build a quote for WhatsApp, then deliver the work yourself or explore GridScout's beta fulfilment workflow.",
  },
  {
    n: "03",
    t: "Prove",
    d: "Move each prospect through your pipeline, keep notes on conversations and track which opportunities become clients. Build your own evidence of the work delivered.",
  },
];

const EARN = [
  {
    tag: "Route A",
    t: "Sell it yourself",
    d: "Unlock the lead, prepare a quote using its recommended fixes, and deliver the work with your own team. You manage the client relationship and your service fee.",
    points: ["Itemised fix plan per business", "Quote built from their own numbers", "One-tap WhatsApp send"],
  },
  {
    tag: "Route B",
    t: "We fix it, you keep the client",
    d: "Need help delivering a service? Submit a fulfilment request for review. If the work is accepted, scope and pricing are agreed before delivery. This workflow is currently in beta.",
    points: ["Selected profile, website and review-related services, subject to fulfilment approval", "You own the client relationship", "Request in one tap from any lead"],
  },
];

type Status = "live" | "beta" | "soon";

const TOOLKIT: { t: string; d: string; s: Status }[] = [
  { t: "Sector scans", d: "Westlands, Kilimani, Nakuru CBD. Any class, any bounding box.", s: "live" },
  { t: "Visibility score", d: "Maps 45% + web 55%, computed from signals owners understand.", s: "live" },
  { t: "Gap preview", d: "Top gaps free on every target. Unlock for the full list and fix plan.", s: "live" },
  { t: "Fix plans and quotes", d: "Priced packages and a WhatsApp-ready quote per business.", s: "live" },
  { t: "AI pitch writer", d: "Email drafted with the prospect’s exact numbers.", s: "live" },
  { t: "Pipeline board", d: "New → contacted → replied → won, with notes.", s: "live" },
  { t: "Done-for-you fixes", d: "Submit selected services through the GridScout beta fulfilment workflow. Requests are reviewed and scope and pricing agreed before work begins.", s: "beta" },
  { t: "Fix checkout", d: "Business owners pay for fixes by M-Pesa inside the audit.", s: "soon" },
  { t: "WhatsApp sequences", d: "Day 0 / 3 / 7 follow-ups, one tap to send.", s: "soon" },
  { t: "White-label reports", d: "Your logo, your colours, shareable link or PDF.", s: "soon" },
  { t: "Review machine", d: "QR and WhatsApp review requests plus AI replies.", s: "soon" },
  { t: "Proof dashboard", d: "Before/after per client. Retention on autopilot.", s: "soon" },
];

const STATUS_STYLE: Record<Status, { label: string; cls: string }> = {
  live: { label: "Live", cls: "text-scout-mint" },
  beta: { label: "Beta", cls: "text-primary" },
  soon: { label: "Soon", cls: "text-scout-amber" },
};

const FAQ = [
  [
    "How accurate is the leak number?",
    "It is an indicative estimate based on available search-demand, visibility and business-value signals. It is not a promise of recoverable revenue; use the displayed assumptions and range to frame a conversation.",
  ],
  [
    "What do I get free, and what costs a credit?",
    "Every target shows its top gaps, score and local competitors for free. One credit unlocks the lead: the full gap list, the itemised fix plan, the contact and the quote tools.",
  ],
  [
    "What if I can’t do the fixes myself?",
    "You can submit a fulfilment request from an unlocked lead. Requests are reviewed first; if accepted, the scope, price and delivery expectations are agreed before work starts. The workflow is in beta.",
  ],
  [
    "Do I need design or SEO skills?",
    "No. The audit tells you what is broken and the fix plan tells you what to sell. The pitch is drafted for you.",
  ],
  [
    "How do I pay?",
    "New accounts receive one free lead credit. Additional bundles are priced at KES 500 for 1 credit, KES 2,500 for 5, or KES 6,000 for 12. Payment checkout availability depends on the deployment; there is no recurring subscription.",
  ],
  [
    "Which areas are covered?",
    "Nairobi, Nakuru and other major towns, with more being added.",
  ],
];

type RoiSliderRowProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  suffix?: string;
};

function RoiSliderRow({
  label, value, min, max, step, onChange, suffix,
}: RoiSliderRowProps) {
  return (
    <div>
      <div className="mb-2 flex justify-between gap-4 font-mono text-[10px] uppercase tracking-widest">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground tabular-nums">{value.toLocaleString("en-KE")}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[hsl(var(--primary))]"
      />
    </div>
  );
}
function RoiCalculator({ to }: { to: string }) {
  const [leads, setLeads] = useState(20);
  const [close, setClose] = useState(10);
  const [retainer, setRetainer] = useState(25000);

  const won = Math.round((leads * close) / 100);
  const recurringRevenue = won * retainer;
  const assumedFixPlanKes = fixValueKes(20);
  const oneOffRevenue = won * assumedFixPlanKes;
  const leadSpend = leads * CREDIT_PRICE_KES;
  const fmt = (n: number) => n.toLocaleString("en-KE");

  return (
    <div className="grid gap-px border border-border bg-border lg:grid-cols-[0.85fr_1.15fr]">
      <div className="space-y-7 bg-card p-6 sm:p-8">
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Adjust your assumptions</div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Model a month of prospecting. Change the inputs to match your own sales process.
          </p>
        </div>
        <RoiSliderRow label="Leads unlocked / month" value={leads} min={5} max={100} step={5} onChange={setLeads} />
        <RoiSliderRow label="Close rate" value={close} min={2} max={30} step={1} onChange={setClose} suffix="%" />
        <RoiSliderRow label="Monthly retainer per client (KES)" value={retainer} min={5000} max={100000} step={2500} onChange={setRetainer} />
        <div className="border-t border-border pt-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Estimated lead spend at standard rate</div>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums">KES {fmt(leadSpend)}</div>
          <p className="mt-1 text-xs text-muted-foreground">List-price estimate: {leads} credits at KES {fmt(CREDIT_PRICE_KES)} each. Free credit and bundle discounts are not included.</p>
        </div>
      </div>
      <div className="panel scanlines flex flex-col justify-between gap-8 bg-card p-6 sm:p-8">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Illustrative pipeline outcome</div>
          <div className="mt-2 font-display text-4xl font-extrabold text-foreground sm:text-5xl">{won} <span className="text-2xl text-muted-foreground">new client{won === 1 ? "" : "s"}</span></div>
          <p className="mt-2 text-sm text-muted-foreground">Based on the close rate you selected, rounded to the nearest whole client.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border border-border bg-background/50 p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-scout-mint">Potential monthly revenue</div>
            <div className="mt-2 font-display text-2xl font-bold tabular-nums">KES {fmt(recurringRevenue)}</div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Assumes each new client starts the retainer you selected.</p>
          </div>
          <div className="border border-border bg-background/50 p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-scout-amber">Potential one-off fix sales</div>
            <div className="mt-2 font-display text-2xl font-bold tabular-nums">KES {fmt(oneOffRevenue)}</div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Assumes each client buys an illustrative KES {fmt(assumedFixPlanKes)} fix plan.</p>
          </div>
        </div>
        <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            These are revenue scenarios, not profit or guaranteed results. They exclude delivery costs, operating expenses, taxes and clients who do not purchase fixes or retainers.
          </p>
          <Link
            to={to}
            className="shrink-0 bg-scout-orange px-6 py-3 text-center font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-transform hover:scale-[1.03]"
          >
            Start free
          </Link>
        </div>
      </div>
    </div>
  );
}
export default function Home() {
  const { user } = useAuth();
  const { data: stats } = trpc.grid.stats.useQuery();
  const cta = user ? "/app" : "/login";

  return (
    <div className="relative min-h-dvh overflow-x-clip bg-background">
      {/* ===== header ===== */}
      <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <div className="flex w-full max-w-3xl items-center gap-1 rounded-full border border-border bg-card/85 py-2 pl-5 pr-2 backdrop-blur-md">
          <Link to="/" className="flex items-center gap-2">
            <RadarLogo size={22} />
            <span className="font-display text-xs font-bold uppercase tracking-[0.26em]">
              Grid<span className="text-primary">Scout</span>
            </span>
          </Link>
          <div className="mx-3 h-4 w-px bg-border" />
          <nav className="hidden items-center gap-4 sm:flex">
            {NAV.map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
              >
                {label}
              </a>
            ))}
          </nav>
          <Link
            to={cta}
            className="ml-auto rounded-full bg-scout-orange px-5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            {user ? "Console" : "Launch console"}
          </Link>
        </div>
      </header>

      {/* ===== hero ===== */}
      <section className="scanlines relative isolate flex min-h-dvh flex-col justify-center overflow-hidden pb-20 pt-32">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 65% 65% at 78% 42%, hsl(188 86% 53% / 0.12), transparent 68%), radial-gradient(ellipse 45% 50% at 12% 78%, hsl(11 100% 60% / 0.07), transparent 70%)",
          }}
        />

        <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10">
          <div className="relative z-10">
            <div className="tech-label tech-label--live mb-7">
              <span className="led" />
              Local commerce intelligence · East Africa
            </div>

            <h1 className="max-w-3xl font-display text-[clamp(2.8rem,6.4vw,5.8rem)] font-extrabold uppercase leading-[0.94] tracking-[-0.055em]">
              Find the
              <br />
              <span className="text-primary" style={{ textShadow: "0 0 42px hsl(var(--primary) / 0.28)" }}>
                opportunity.
              </span>
              <br />
              Own the
              <br />
              relationship.
            </h1>

            <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              GridScout turns local search visibility gaps into sales opportunities.
              Find businesses that need help, understand what is holding them back,
              and turn a clear diagnosis into your next client.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                to={cta}
                className="inline-flex min-h-14 items-center justify-center bg-scout-orange px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.18em] text-white transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                Explore opportunities <span className="ml-3 text-base">→</span>
              </Link>
              <a
                href="#loop"
                className="inline-flex min-h-14 items-center justify-center border border-border px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                See how it works
              </a>
            </div>

            <div className="mt-12 grid max-w-xl grid-cols-3 gap-4 border-t border-border pt-6">
              <div>
                <div className="font-display text-2xl font-bold tabular-nums text-foreground md:text-3xl">
                  {stats?.businessesIndexed ?? "?"}
                </div>
                <div className="mt-1 font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-muted-foreground">
                  Businesses indexed
                </div>
              </div>
              <div>
                <div className="font-display text-2xl font-bold tabular-nums text-scout-red md:text-3xl">
                  {stats?.invisibleCount ?? "?"}
                </div>
                <div className="mt-1 font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-muted-foreground">
                  Visibility gaps
                </div>
              </div>
              <div>
                <div className="font-display text-2xl font-bold tabular-nums text-scout-amber md:text-3xl">
                  {stats ? fmtCompactKes(stats.totalLostRevenueKes) : "?"}
                </div>
                <div className="mt-1 font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-muted-foreground">
                  Estimated monthly gap
                </div>
              </div>
            </div>
            <p className="mt-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70">
              Platform-wide estimates · Updated from indexed data
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-2xl">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-5 rounded-full opacity-50 blur-3xl"
              style={{ background: "hsl(var(--primary) / 0.10)" }}
            />

            <div className="panel relative overflow-hidden shadow-2xl shadow-black/40">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center border border-primary/30 bg-primary/10 font-mono text-sm font-bold text-primary">
                    G
                  </div>
                  <div>
                    <div className="font-mono text-[11px] font-bold uppercase tracking-[0.16em]">
                      GridScout intelligence
                    </div>
                    <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      Opportunity preview / sample data
                    </div>
                  </div>
                </div>
                <span className="tech-label text-[9px]">Illustrative</span>
              </div>

              <div className="grid gap-0 sm:grid-cols-[1.05fr_0.95fr]">
                <div className="border-b border-border p-5 sm:border-b-0 sm:border-r">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                      Sample business
                    </span>
                    <span className="font-mono text-[9px] text-scout-amber">WESTLANDS · NAIROBI</span>
                  </div>

                  <h2 className="mt-3 font-display text-xl font-bold uppercase tracking-tight">
                    Dental practice
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Local search visibility assessment
                  </p>

                  <div className="mt-7 flex items-end justify-between gap-4">
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                        Visibility score
                      </div>
                      <div className="mt-1 font-display text-6xl font-extrabold leading-none text-scout-red">
                        28<span className="text-xl text-muted-foreground">/100</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                        Opportunity estimate
                      </div>
                      <div className="mt-2 font-display text-lg font-bold text-scout-amber">
                        KES 95–140K
                      </div>
                      <div className="font-mono text-[9px] text-muted-foreground">per month · illustrative</div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider">
                        <span className="text-muted-foreground">Maps presence</span>
                        <span className="text-scout-amber">32 / 100</span>
                      </div>
                      <div className="h-1.5 overflow-hidden bg-secondary">
                        <div className="h-full w-[32%] bg-scout-amber" />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider">
                        <span className="text-muted-foreground">Website signals</span>
                        <span className="text-scout-red">24 / 100</span>
                      </div>
                      <div className="h-1.5 overflow-hidden bg-secondary">
                        <div className="h-full w-[24%] bg-scout-red" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative min-h-[245px] overflow-hidden bg-[#080f1b] p-5">
                  <div className="absolute inset-0 opacity-30" style={{
                    backgroundImage: "linear-gradient(hsl(var(--primary) / 0.16) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.16) 1px, transparent 1px)",
                    backgroundSize: "25px 25px",
                  }} />
                  <div className="relative flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                      Signal field
                    </span>
                    <span className="font-mono text-[9px] text-primary">SAMPLE / 01</span>
                  </div>

                  <div className="relative mx-auto mt-5 flex h-36 w-36 items-center justify-center">
                    <div className="absolute inset-0 rounded-full border border-primary/20" />
                    <div className="absolute inset-4 rounded-full border border-primary/30" />
                    <div className="absolute inset-8 rounded-full border border-primary/40" />
                    <div className="absolute inset-0 rounded-full border-t border-primary/80" style={{ animation: "radar-sweep 5s linear infinite" }} />
                    <div className="absolute h-2 w-2 rounded-full bg-scout-orange shadow-[0_0_16px_hsl(var(--scout-orange))]" />
                    <span className="absolute left-5 top-8 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="absolute right-7 top-12 h-1.5 w-1.5 rounded-full bg-scout-amber" />
                    <span className="absolute bottom-7 left-10 h-1.5 w-1.5 rounded-full bg-scout-red" />
                    <span className="absolute bottom-10 right-8 h-1.5 w-1.5 rounded-full bg-primary" />
                  </div>

                  <div className="relative mt-3 flex items-center justify-between border-t border-border/70 pt-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    <span>Search signals</span>
                    <span>Illustrative map view</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">
                    Detected opportunity gaps
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-scout-amber">
                    5 sample signals
                  </span>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center gap-2 border-l-2 border-scout-amber bg-secondary/50 px-3 py-2.5">
                    <span className="text-scout-amber">!</span>
                    <span className="text-[11px]">Weak local keyword visibility</span>
                  </div>
                  <div className="flex items-center gap-2 border-l-2 border-scout-amber bg-secondary/50 px-3 py-2.5">
                    <span className="text-scout-amber">!</span>
                    <span className="text-[11px]">Website presence needs work</span>
                  </div>
                  <div className="flex items-center gap-2 border-l-2 border-border bg-secondary/30 px-3 py-2.5">
                    <span className="text-muted-foreground">?</span>
                    <span className="text-[11px] text-muted-foreground">Review signals to investigate</span>
                  </div>
                  <div className="flex items-center gap-2 border-l-2 border-border bg-secondary/30 px-3 py-2.5">
                    <span className="text-muted-foreground">?</span>
                    <span className="text-[11px] text-muted-foreground">Competitor coverage to compare</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                      Example service plan
                    </div>
                    <div className="mt-1 font-display text-lg font-bold text-scout-mint">
                      KES 39,500
                    </div>
                  </div>
                  <Link
                    to={cta}
                    className="inline-flex items-center gap-2 border border-primary/40 px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary/10"
                  >
                    Unlock opportunities <span>→</span>
                  </Link>
                </div>
              </div>
            </div>

            <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/70">
              Illustrative interface and estimates · Not a live business audit or customer result
            </p>
          </div>
        </div>
      </section>

      <Ticker />

      {/* ===== the loop ===== */}
      <section id="loop" className="mx-auto max-w-6xl px-6 py-24">
        <div className="tech-label mb-4">The loop</div>
        <h2 className="max-w-2xl font-display text-3xl font-bold uppercase tracking-tight md:text-4xl">
          Not just a report. A revenue loop.
        </h2>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Other tools stop at the diagnosis. GridScout carries you through the sale, the fix and the proof.
        </p>
        <div className="mt-12 grid gap-px border border-border bg-border md:grid-cols-3">
          {LOOP.map((s) => (
            <div key={s.n} className="group bg-card p-8 transition-colors hover:bg-secondary/60">
              <div className="font-display text-sm font-bold text-primary">{s.n}</div>
              <h3 className="mt-4 font-display text-2xl font-bold uppercase tracking-wide">{s.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== ways to earn ===== */}
      <section id="earn" className="hairline-t">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="tech-label mb-4">Ways to earn</div>
          <h2 className="max-w-2xl font-display text-3xl font-bold uppercase tracking-tight md:text-4xl">
            Two routes from gap to invoice
          </h2>
          <div className="mt-12 grid gap-px border border-border bg-border md:grid-cols-2">
            {EARN.map((e) => (
              <div key={e.t} className="bg-card p-8">
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">{e.tag}</div>
                <h3 className="mt-3 font-display text-2xl font-bold uppercase tracking-wide">{e.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{e.d}</p>
                <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                  {e.points.map((p) => (
                    <li key={p}>— {p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== engine ===== */}
      <section className="hairline-t">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-2">
          <div>
            <div className="tech-label mb-4">The visibility engine</div>
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight md:text-4xl">
              A score your clients can’t argue with
            </h2>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              SEO suites cost $100+/month and speak in jargon. GIS software costs thousands and speaks
              in shapefiles. GridScout gives you one number, one map and one KES figure, with the
              formula shown so you can defend it in the room.
            </p>
          </div>
          <ul className="space-y-3">
            {[
              ["Maps presence · 45%", "claimed profile, rating, review velocity, posts, responsiveness"],
              ["Web presence · 55%", "website, speed, mobile, metadata, money-keyword rank"],
              ["Leak pricing", "monthly searches × missed capture × ticket size, shown as a range"],
            ].map(([t, d]) => (
              <li key={t} className="border-l-2 border-primary bg-secondary/40 py-3 pl-4">
                <div className="font-mono text-xs font-bold uppercase tracking-widest text-primary">{t}</div>
                <div className="mt-1 text-xs text-muted-foreground">{d}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== toolkit ===== */}
      <section id="toolkit" className="hairline-t">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="tech-label mb-4">Toolkit</div>
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight md:text-4xl">
            Everything an agency needs to close
          </h2>
          <div className="mt-12 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {TOOLKIT.map((f) => (
              <div key={f.t} className="bg-card p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wide">{f.t}</h3>
                  <span className={`font-mono text-[9px] uppercase tracking-widest ${STATUS_STYLE[f.s].cls}`}>
                    {STATUS_STYLE[f.s].label}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== roi ===== */}
      <section id="roi" className="hairline-t">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="tech-label mb-4">The maths</div>
          <h2 className="mb-12 font-display text-3xl font-bold uppercase tracking-tight md:text-4xl">
            What is one lead credit worth?
          </h2>
          <RoiCalculator to={cta} />
        </div>
      </section>

      {/* ===== pricing ===== */}
      <section id="pricing" className="hairline-t relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
          <div className="absolute -right-40 top-10 h-96 w-96 rounded-full border border-primary/10" />
          <div className="absolute -right-24 top-24 h-64 w-64 rounded-full border border-primary/10" />
          <div className="absolute -right-8 top-40 h-32 w-32 rounded-full border border-primary/10" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <div className="tech-label mb-5">Simple, usage-based pricing</div>
              <h2 className="max-w-xl font-display text-4xl font-bold uppercase leading-[1.05] tracking-tight sm:text-5xl">
                Pay for the <span className="text-primary">opportunities</span> you unlock.
              </h2>
            </div>
            <p className="max-w-lg text-sm leading-7 text-muted-foreground lg:justify-self-end">
              Scan sectors freely. Preview business opportunities. Spend a credit only when you want the full lead, its detailed gaps and its actionable fix plan. No subscription required.
            </p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            <div className="group border border-border bg-card p-6 transition-colors hover:border-primary/50 sm:p-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Single opportunity</div>
              <div className="mt-6 font-display text-4xl font-extrabold tracking-tight">KES 500</div>
              <div className="mt-2 text-sm text-muted-foreground">1 lead credit</div>
              <div className="my-7 h-px bg-border" />
              <p className="text-sm leading-6 text-muted-foreground">A simple way to unlock one business and explore its full sales opportunity.</p>
              <div className="mt-8 font-mono text-[10px] uppercase tracking-widest text-primary">Flexible starting point</div>
            </div>

            <div className="group border border-border bg-card p-6 transition-colors hover:border-primary/50 sm:p-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Active prospecting</div>
              <div className="mt-6 font-display text-4xl font-extrabold tracking-tight">KES 2,500</div>
              <div className="mt-2 text-sm text-muted-foreground">5 lead credits · KES 500 each</div>
              <div className="my-7 h-px bg-border" />
              <p className="text-sm leading-6 text-muted-foreground">Unlock several prospects as you build and work through your sales pipeline.</p>
              <div className="mt-8 font-mono text-[10px] uppercase tracking-widest text-primary">For consistent outreach</div>
            </div>

            <div className="relative border border-scout-orange/60 bg-secondary/70 p-6 sm:p-8">
              <div className="absolute right-4 top-4 border border-scout-orange/40 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-scout-orange">More capacity</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-scout-orange">Agency prospecting</div>
              <div className="mt-6 font-display text-4xl font-extrabold tracking-tight">KES 6,000</div>
              <div className="mt-2 text-sm text-muted-foreground">12 lead credits · KES 500 each</div>
              <div className="my-7 h-px bg-border" />
              <p className="text-sm leading-6 text-muted-foreground">A larger pool of opportunities for agencies and operators prospecting regularly.</p>
              <div className="mt-8 font-mono text-[10px] uppercase tracking-widest text-scout-orange">For higher-volume workflows</div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-6 border border-border bg-card/70 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-scout-mint/30 font-mono text-sm text-scout-mint">01</div>
              <div>
                <h3 className="font-display text-lg font-bold uppercase">Start with one free credit</h3>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  New accounts receive one free lead credit. Explore GridScout before spending anything. Additional credit bundles are available at transparent KES prices.
                </p>
              </div>
            </div>
            <Link
              to={cta}
              className="shrink-0 bg-scout-orange px-7 py-4 text-center font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-transform hover:scale-[1.03]"
            >
              Get started free
            </Link>
          </div>

          <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            No recurring subscription · One free credit for new accounts · Transparent KES pricing
          </p>
        </div>
      </section>
      {/* ===== faq ===== */}
      <section className="hairline-t">
        <div className="mx-auto max-w-3xl px-6 py-24">
          <div className="tech-label mb-4">FAQ</div>
          <div className="divide-y divide-border border-y border-border">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between font-display text-sm font-bold uppercase tracking-wide">
                  {q}
                  <span className="font-mono text-primary transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== final ===== */}
      <section className="hairline-t">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <div className="tech-label tech-label--live mx-auto mb-6">Uplink ready</div>
          <h2 className="mx-auto max-w-3xl font-display text-4xl font-extrabold uppercase tracking-tight md:text-5xl">
            Find the next business <span className="text-primary">that needs your expertise.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            Start with one free lead credit. Explore the opportunity before deciding whether to unlock it.
          </p>
          <Link
            to={cta}
            className="mt-9 inline-block bg-scout-orange px-10 py-4 font-mono text-xs font-bold uppercase tracking-[0.22em] text-white transition-transform hover:scale-[1.03]"
          >
            Enter mission control
          </Link>
        </div>
      </section>

      <footer className="hairline-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <div className="flex items-center gap-2">
            <RadarLogo size={18} />
            <span>GridScout · Spatial SEO Intelligence</span>
          </div>
          <span>Nairobi · Nakuru · beyond</span>
        </div>
      </footer>
    </div>
  );
}