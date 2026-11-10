import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { fmtCompactKes } from "@/lib/format";
import { RadarLogo } from "@/components/RadarLogo";
import { Ticker } from "@/components/Ticker";

export default function Home() {
  const { user } = useAuth();
  const { data: stats } = trpc.grid.stats.useQuery();

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
            <a href="#how" className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary">
              How it works
            </a>
            <a href="#engine" className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary">
              The engine
            </a>
            <a href="#pricing" className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary">
              Pricing
            </a>
          </nav>
          <Link
            to={user ? "/app" : "/login"}
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

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="tech-label tech-label--live mb-6">Hyper-local spatial SEO · East Africa</div>
            <h1 className="font-display text-[clamp(2.6rem,7vw,5.2rem)] font-extrabold uppercase leading-[0.98] tracking-tight">
              Every search
              <br />
              has a winner.
              <br />
              <span className="text-primary" style={{ textShadow: "0 0 40px hsl(var(--primary) / 0.4)" }}>
                Scout the losers.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">
              GridScout sweeps any sector of Nairobi grid-by-grid, scores every business's local
              visibility from 0–100, prices the revenue leaking to competitors in KES — then drafts
              the AI pitch that turns invisible businesses into your agency's clients.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                to={user ? "/app" : "/login"}
                className="bg-scout-orange px-8 py-4 font-mono text-xs font-bold uppercase tracking-[0.22em] text-white transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                Start scanning — free
              </Link>
              <a
                href="#how"
                className="border border-border px-8 py-4 font-mono text-xs font-bold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                How it works
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
                <div className="text-2xl font-bold text-scout-amber">{stats ? fmtCompactKes(stats.totalLostRevenueKes) : "—"}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">leaking monthly</div>
              </div>
            </div>
          </div>

          {/* hero radar */}
          <div className="relative mx-auto hidden aspect-square w-full max-w-md lg:block" aria-hidden="true">
            <div className="absolute inset-0 rounded-full border border-border" />
            <div className="absolute inset-[14%] rounded-full border border-border" />
            <div className="absolute inset-[28%] rounded-full border border-border" />
            <div className="absolute inset-[42%] rounded-full border border-border" />
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <div className="radar-sweep absolute inset-0" />
            </div>
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_20px_hsl(var(--primary))]" />
            {/* blips */}
            <div className="absolute left-[24%] top-[31%]">
              <span className="led absolute" />
              <span className="absolute -left-6 top-3 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest text-scout-red">
                vis 12 · −KES 234K/mo
              </span>
            </div>
            <div className="absolute left-[68%] top-[58%]">
              <span className="led absolute" style={{ background: "hsl(var(--scout-amber))" }} />
              <span className="absolute -left-8 top-3 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest text-scout-amber">
                vis 41 · −KES 96K/mo
              </span>
            </div>
            <div className="absolute left-[57%] top-[22%]">
              <span className="led absolute" style={{ background: "hsl(var(--scout-mint))" }} />
              <span className="absolute -left-8 top-3 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest text-scout-mint">
                vis 78 · capturing
              </span>
            </div>
          </div>
        </div>
      </section>

      <Ticker />

      {/* ===== how it works ===== */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <div className="tech-label mb-4">Field protocol</div>
        <h2 className="max-w-2xl font-display text-3xl font-bold uppercase tracking-tight md:text-4xl">
          From invisible to invoice in three moves
        </h2>

        <div className="mt-12 grid gap-px border border-border bg-border md:grid-cols-3">
          {[
            {
              n: "01",
              t: "Define the grid",
              d: "Pick a sector — Westlands, Kilimani, Nakuru CBD — and a target class: dentists, plumbers, law firms. GridScout pulls every business in the bounding box.",
            },
            {
              n: "02",
              t: "Scan the sector",
              d: "The engine scores Maps presence (45%) and web presence (55%) for every contact, maps competitor rings, and prices each business's monthly revenue leak in KES.",
            },
            {
              n: "03",
              t: "Unlock & pitch",
              d: "One M-Pesa credit unlocks the full dossier — phone, website, leak analysis — and the AI drafts a pitch email quoting their exact numbers. Agencies close warm, not cold.",
            },
          ].map((s) => (
            <div key={s.n} className="group bg-card p-8 transition-colors hover:bg-secondary/60">
              <div className="font-display text-sm font-bold text-primary">{s.n}</div>
              <h3 className="mt-4 font-display text-xl font-bold uppercase tracking-wide">{s.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== engine ===== */}
      <section id="engine" className="hairline-t">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-2">
          <div>
            <div className="tech-label mb-4">The visibility engine</div>
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight md:text-4xl">
              A score your clients can't argue with
            </h2>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              Traditional SEO tools cost $100+/month and speak in jargon. ArcGIS costs thousands and
              speaks in shapefiles. GridScout sits in the middle: one number, one map, one invoice-sized
              leak — computed from signals any business owner understands.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                ["Maps presence 45%", "claimed profile, rating, review velocity, posts, responsiveness"],
                ["Web presence 55%", "website, Lighthouse speed, mobile, metadata, money-keyword rank"],
                ["Leak pricing", "monthly searches × missed capture × ticket size = KES at risk"],
              ].map(([t, d]) => (
                <li key={t} className="border-l-2 border-primary bg-secondary/40 py-2.5 pl-4">
                  <div className="font-mono text-xs font-bold uppercase tracking-widest text-primary">{t}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{d}</div>
                </li>
              ))}
            </ul>
          </div>

          {/* score anatomy mock */}
          <div className="panel scanlines relative p-6">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Live audit · sample
              </span>
              <span className="led" />
            </div>
            <div className="mt-4 font-display text-lg font-bold">Nuru Smiles Dental Care</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Dentist · Westlands
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-widest">
                  <span className="text-muted-foreground">Maps presence</span>
                  <span className="text-scout-amber">55</span>
                </div>
                <div className="h-1.5 bg-secondary">
                  <div className="h-full w-[55%] bg-scout-amber" />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-widest">
                  <span className="text-muted-foreground">Web presence</span>
                  <span className="text-scout-red">8</span>
                </div>
                <div className="h-1.5 bg-secondary">
                  <div className="h-full w-[8%] bg-scout-red" />
                </div>
              </div>
            </div>
            <div className="hairline-t mt-6 flex items-end justify-between pt-5">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Visibility score
                </div>
                <div className="font-display text-5xl font-extrabold text-scout-red">25</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Leak</div>
                <div className="font-display text-xl font-bold text-scout-red">KES 118K/mo</div>
              </div>
            </div>
            <div className="mt-5 border-l-2 border-scout-amber bg-secondary/40 py-2 pl-3 font-mono text-[11px] text-foreground/90">
              Not ranking for “dentist near me” — competitor 400m away holds #2
            </div>
          </div>
        </div>
      </section>

      {/* ===== pricing ===== */}
      <section id="pricing" className="hairline-t">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="tech-label mb-4">Monetization</div>
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight md:text-4xl">
            Priced for the M-Pesa economy
          </h2>
          <div className="mt-12 grid gap-px border border-border bg-border md:grid-cols-2">
            <div className="bg-card p-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Agencies · B2B</div>
              <div className="mt-4 font-display text-4xl font-extrabold">
                KES 3,000<span className="text-base font-normal text-muted-foreground">/mo</span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">or KES 500 per lead credit</p>
              <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
                <li>— Unlimited sector scans, all of Nairobi + Nakuru</li>
                <li>— Full audit dossier per unlocked lead</li>
                <li>— AI pitch generation with your numbers</li>
                <li>— Pipeline board: contacted → won</li>
              </ul>
              <Link
                to={user ? "/app" : "/login"}
                className="mt-8 block border border-primary px-6 py-3.5 text-center font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Start with 1 free credit
              </Link>
            </div>
            <div className="bg-card p-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-scout-orange">Business owners</div>
              <div className="mt-4 font-display text-4xl font-extrabold">
                KES 200<span className="text-base font-normal text-muted-foreground">/audit</span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">upsell to KES 1,500/mo monitoring</p>
              <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
                <li>— “See who is stealing your customers” audit map</li>
                <li>— Your visibility score vs. the street</li>
                <li>— The three fixes that matter first</li>
                <li>— Monthly rank + leak tracking</li>
              </ul>
              <Link
                to={user ? "/app" : "/login"}
                className="mt-8 block bg-scout-orange px-6 py-3.5 text-center font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-transform hover:scale-[1.02]"
              >
                Audit my business
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== final ===== */}
      <section className="hairline-t">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <div className="tech-label tech-label--live mx-auto mb-6">Uplink ready</div>
          <h2 className="mx-auto max-w-3xl font-display text-4xl font-extrabold uppercase tracking-tight md:text-5xl">
            The grid is live. <span className="text-primary">Scan it.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            New accounts get one free lead credit — no card, no M-Pesa prompt until you decide the
            signal is worth it.
          </p>
          <Link
            to={user ? "/app" : "/login"}
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
