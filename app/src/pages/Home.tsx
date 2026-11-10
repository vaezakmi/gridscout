import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { fmtCompactKes } from "@/lib/format";
import { RadarLogo } from "@/components/RadarLogo";
import { Ticker } from "@/components/Ticker";

const NAV = [
  ["#loop", "The loop"],
  ["#toolkit", "Toolkit"],
  ["#roi", "ROI"],
  ["#pricing", "Pricing"],
];

const LOOP = [
  {
    n: "01",
    t: "Find",
    d: "Sweep a sector grid by grid. Every business scored 0–100 on Maps and web presence, with the monthly leak priced in KES and shown as a range.",
  },
  {
    n: "02",
    t: "Fix",
    d: "Every audit ends with a priced fix plan: profile claim, review drive, one-page site. Sell it, or let a partner deliver it. Paid via M-Pesa.",
  },
  {
    n: "03",
    t: "Prove",
    d: "Monthly before/after: rank, reviews, recovered revenue. White-label reports your clients forward to their friends.",
  },
];

const TOOLKIT = [
  { t: "Sector scans", d: "Westlands, Kilimani, Nakuru CBD. Any class, any bounding box.", live: true },
  { t: "Visibility score", d: "Maps 45% + web 55%, computed from signals owners understand.", live: true },
  { t: "KES leak pricing", d: "Searches × missed capture × ticket size, with a confidence range.", live: true },
  { t: "AI pitch writer", d: "Email drafted with the prospect’s exact numbers.", live: true },
  { t: "Pipeline board", d: "Contacted → replied → proposal → won.", live: true },
  { t: "WhatsApp sequences", d: "Day 0 / 3 / 7 follow-ups, one tap to send.", live: false },
  { t: "White-label reports", d: "Your logo, your colours, shareable link or PDF.", live: false },
  { t: "Fix-it checkout", d: "Priced packages with M-Pesa payment at the end of every audit.", live: false },
  { t: "Review machine", d: "QR and WhatsApp review requests plus AI replies.", live: false },
  { t: "Rank-change alerts", d: "“A competitor just overtook your client.” Weekly.", live: false },
  { t: "Territory lock", d: "Exclusive scanning rights on a sector for 30 days.", live: false },
  { t: "Proof dashboard", d: "Before/after per client. Retention on autopilot.", live: false },
];

const FAQ = [
  [
    "How accurate is the leak number?",
    "It is an estimate built from public search volume, ranking position and average ticket size. We show the formula and a range, so you can defend every figure in a pitch.",
  ],
  [
    "Do I need design or SEO skills?",
    "No. The audit tells you what is broken and the fix plan tells you what to sell. The pitch is drafted for you.",
  ],
  [
    "How do I pay?",
    "M-Pesa. Buy credits or subscribe. New accounts get one free lead credit, no card needed.",
  ],
  [
    "Which areas are covered?",
    "Nairobi and Nakuru today, with more towns being added.",
  ],
];

function RoiCalculator({ to }: { to: string }) {
  const [leads, setLeads] = useState(20);
  const [close, setClose] = useState(10);
  const [retainer, setRetainer] = useState(25000);

  const won = Math.round((leads * close) / 100);
  const revenue = won * retainer;
  const cost = leads * 500;
  const multiple = cost ? Math.round(revenue / cost) : 0;
  const fmt = (n: number) => n.toLocaleString("en-KE");

  const Row = ({
    label, value, min, max, step, onChange, suffix,
  }: {
    label: string; value: number; min: number; max: number; step: number;
    onChange: (v: number) => void; suffix?: string;
  }) => (
    <div>
      <div className="mb-2 flex justify-between font-mono text-[10px] uppercase tracking-widest">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">{fmt(value)}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[hsl(var(--primary))]"
      />
    </div>
  );

  return (
    <div className="grid gap-px border border-border bg-border lg:grid-cols-2">
      <div className="space-y-6 bg-card p-8">
        <Row label="Leads unlocked / month" value={leads} min={5} max={100} step={5} onChange={setLeads} />
        <Row label="Close rate" value={close} min={2} max={30} step={1} onChange={setClose} suffix="%" />
        <Row label="Your monthly retainer (KES)" value={retainer} min={5000} max={100000} step={2500} onChange={setRetainer} />
      </div>
      <div className="panel scanlines flex flex-col justify-between bg-card p-8">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            New recurring revenue / month
          </div>
          <div className="mt-2 font-display text-5xl font-extrabold text-scout-mint">KES {fmt(revenue)}</div>
          <div className="mt-2 font-mono text-[11px] text-muted-foreground">
            {won} new client{won === 1 ? "" : "s"} · lead cost KES {fmt(cost)}
          </div>
        </div>
        <div className="mt-8 flex items-end justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Return</div>
            <div className="font-display text-3xl font-bold text-primary">{multiple}×</div>
          </div>
          <Link
            to={to}
            className="bg-scout-orange px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-transform hover:scale-[1.03]"
          >
            Start free
          </Link>
        </div>
        <p className="mt-6 text-[10px] text-muted-foreground">
          Illustrative. Retainers are recurring, so each client keeps paying after the lead credit is spent.
        </p>
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
      <section className="scanlines relative flex min-h-dvh flex-col justify-center overflow-hidden pt-28 pb-16">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 72% 42%, hsl(188 86% 53% / 0.09), transparent 65%), radial-gradient(ellipse 55% 45% at 18% 80%, hsl(11 100% 60% / 0.06), transparent 60%)",
          }}
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="tech-label tech-label--live mb-6">Find · Fix · Prove · East Africa</div>
            <h1 className="font-display text-[clamp(2.6rem,7vw,5.2rem)] font-extrabold uppercase leading-[0.98] tracking-tight">
              Turn invisible
              <br />
              businesses into
              <br />
              <span className="text-primary" style={{ textShadow: "0 0 40px hsl(var(--primary) / 0.4)" }}>
                paying clients.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">
              GridScout finds the businesses losing customers on Google, prices the loss in KES,
              hands you the pitch, and tracks the fix until you can prove the win. One tool from
              first scan to signed retainer.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                to={cta}
                className="bg-scout-orange px-8 py-4 font-mono text-xs font-bold uppercase tracking-[0.22em] text-white transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                Scan a sector free
              </Link>
              <a
                href="#roi"
                className="border border-border px-8 py-4 font-mono text-xs font-bold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Calculate my ROI
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-8 font-mono">
              <div>
                <div className="text-2xl font-bold text-foreground">{stats?.businessesIndexed ?? "—"}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">businesses indexed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-scout-red">{stats?.invisibleCount ?? "—"}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">currently invisible</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-scout-amber">
                  {stats ? fmtCompactKes(stats.totalLostRevenueKes) : "—"}
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">leaking monthly</div>
              </div>
            </div>
          </div>

          {/* hero: audit → pitch card */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="panel scanlines relative p-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Sample dossier · Westlands
                </span>
                <span className="led" />
              </div>
              <div className="mt-4 font-display text-lg font-bold">Nuru Smiles Dental Care</div>
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Visibility</div>
                  <div className="font-display text-5xl font-extrabold text-scout-red">25</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Leak</div>
                  <div className="font-display text-xl font-bold text-scout-red">KES 95–140K/mo</div>
                </div>
              </div>
              <div className="hairline-t mt-5 pt-4">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Fix plan</div>
                <ul className="space-y-1.5 font-mono text-[11px] text-foreground/90">
                  <li className="flex justify-between"><span>Claim and optimise profile</span><span>KES 8,000</span></li>
                  <li className="flex justify-between"><span>Review drive (30 days)</span><span>KES 6,500</span></li>
                  <li className="flex justify-between"><span>One-page mobile site</span><span>KES 25,000</span></li>
                </ul>
              </div>
              <div className="mt-5 border-l-2 border-scout-mint bg-secondary/40 py-2 pl-3 text-[11px] leading-relaxed text-foreground/90">
                “Hi Dr. Nuru, a competitor 400m away holds #2 for ‘dentist near me’. It is costing you
                roughly KES 118K a month. Want the 3-step fix?”
              </div>
            </div>
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
                  <span
                    className={`font-mono text-[9px] uppercase tracking-widest ${
                      f.live ? "text-scout-mint" : "text-scout-amber"
                    }`}
                  >
                    {f.live ? "Live" : "Soon"}
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
      <section id="pricing" className="hairline-t">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="tech-label mb-4">Pricing</div>
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight md:text-4xl">
            Priced for the M-Pesa economy
          </h2>
          <div className="mt-12 grid gap-px border border-border bg-border md:grid-cols-3">
            {/* Scout */}
            <div className="bg-card p-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Scout · Freelancers</div>
              <div className="mt-4 font-display text-4xl font-extrabold">
                KES 3,000<span className="text-base font-normal text-muted-foreground">/mo</span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">or KES 500 per lead credit</p>
              <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
                <li>— Unlimited sector scans</li>
                <li>— Full dossier per unlocked lead</li>
                <li>— AI pitch with your numbers</li>
                <li>— Pipeline board</li>
              </ul>
              <Link
                to={cta}
                className="mt-8 block border border-primary px-6 py-3.5 text-center font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Start with 1 free credit
              </Link>
            </div>

            {/* Agency (highlighted) */}
            <div className="relative bg-secondary/60 p-8">
              <div className="absolute right-4 top-4 bg-scout-orange px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-white">
                Best value
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-scout-orange">Agency · Teams</div>
              <div className="mt-4 font-display text-4xl font-extrabold">
                KES 9,500<span className="text-base font-normal text-muted-foreground">/mo</span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">includes 25 lead credits</p>
              <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
                <li>— Everything in Scout</li>
                <li>— White-label reports (soon)</li>
                <li>— WhatsApp sequences (soon)</li>
                <li>— Proof dashboard and team seats (soon)</li>
              </ul>
              <Link
                to={cta}
                className="mt-8 block bg-scout-orange px-6 py-3.5 text-center font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-transform hover:scale-[1.02]"
              >
                Go Agency
              </Link>
            </div>

            {/* Business */}
            <div className="bg-card p-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-scout-mint">Business owners</div>
              <div className="mt-4 font-display text-4xl font-extrabold">
                KES 200<span className="text-base font-normal text-muted-foreground">/audit</span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">monitoring KES 1,500/mo · fixes from KES 6,500</p>
              <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
                <li>— See who is taking your customers</li>
                <li>— Your score vs. the street</li>
                <li>— The three fixes that matter first</li>
                <li>— Optional done-for-you fixes (soon)</li>
              </ul>
              <Link
                to={cta}
                className="mt-8 block border border-border px-6 py-3.5 text-center font-mono text-xs font-bold uppercase tracking-[0.2em] text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Audit my business
              </Link>
            </div>
          </div>
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
            Your next client is losing money <span className="text-primary">right now.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            One free lead credit. No card, no M-Pesa prompt until you decide the signal is worth it.
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