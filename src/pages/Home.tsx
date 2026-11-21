
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { CREDIT_PRICE_KES } from "@contracts/grid";
import { useAuth } from "@/hooks/useAuth";
import { RadarLogo } from "@/components/RadarLogo";
import { Ticker } from "@/components/Ticker";

/* -------------------------------------------------------------------------- */
/* GRIDSCOUT — homepage experience                                           */
/* -------------------------------------------------------------------------- */

type ServiceStatus = "live" | "beta" | "admin";
type ToolkitStatus = "live" | "beta" | "planned";

interface Service {
  number: string;
  symbol: string;
  name: string;
  category: string;
  description: string;
  detail: string;
  route: string;
  status: ServiceStatus;
  featured?: boolean;
}

const SERVICES: Service[] = [
  {
    number: "01",
    symbol: "◎",
    name: "Live Grid",
    category: "MARKET DISCOVERY",
    description: "See the business landscape. Find opportunities hiding in plain sight.",
    detail: "Explore indexed businesses, geographic markets and available opportunity signals.",
    route: "/app",
    status: "live",
    featured: true,
  },
  {
    number: "02",
    symbol: "◉",
    name: "Visibility Audit",
    category: "DIGITAL INTELLIGENCE",
    description: "Understand why a business may be losing ground in local search.",
    detail: "Review Maps and website signals, identified gaps and practical improvement opportunities.",
    route: "/app",
    status: "live",
  },
  {
    number: "03",
    symbol: "↗",
    name: "Sales Pipeline",
    category: "CLIENT ACQUISITION",
    description: "Turn promising businesses into real client relationships.",
    detail: "Unlock prospects, prepare pitches, record conversations and track sales progress.",
    route: "/leads",
    status: "live",
  },
  {
    number: "04",
    symbol: "◇",
    name: "Trust Profile",
    category: "BUSINESS TRUST",
    description: "Bring important business signals into one public-facing view.",
    detail: "Explore the Trust Profile beta and its available business information.",
    route: "/b/1",
    status: "beta",
  },
  {
    number: "05",
    symbol: "▥",
    name: "CFO Intelligence",
    category: "FINANCIAL OPERATIONS",
    description: "Get a clearer picture of business cashflow and financial activity.",
    detail: "Explore the financial dashboard and transaction-preview experience.",
    route: "/app/cfo",
    status: "beta",
  },
  {
    number: "06",
    symbol: "⌂",
    name: "Keja Management",
    category: "PROPERTY OPERATIONS",
    description: "Bring rental units, tenants and collection activity into one workspace.",
    detail: "Explore the property-management beta and its local preview workflows.",
    route: "/app/keja",
    status: "beta",
  },
  {
    number: "07",
    symbol: "⌘",
    name: "Service Desk",
    category: "FULFILMENT OPERATIONS",
    description: "Coordinate submitted service requests and delivery workflows.",
    detail: "Review and manage fulfilment requests. Administrator access required.",
    route: "/admin/fixes",
    status: "admin",
  },
  {
    number: "08",
    symbol: "⌖",
    name: "OSM Preview",
    category: "GEOSPATIAL DISCOVERY",
    description: "Inspect potential business locations before they enter the grid.",
    detail: "Administrator-only discovery preview. Candidate inspection is separate from approval and import.",
    route: "/admin/osm",
    status: "admin",
  },
];

const WORKFLOW = [
  {
    number: "01",
    title: "Discover",
    symbol: "◎",
    description:
      "Explore geographic markets and identify businesses worth investigating.",
    outcome: "A clearer view of the market",
  },
  {
    number: "02",
    title: "Diagnose",
    symbol: "◉",
    description:
      "Examine digital presence, visibility signals and potential areas of weakness.",
    outcome: "Evidence behind the opportunity",
  },
  {
    number: "03",
    title: "Connect",
    symbol: "↗",
    description:
      "Unlock prospect information, prepare relevant pitches and manage conversations.",
    outcome: "A structured sales pipeline",
  },
  {
    number: "04",
    title: "Deliver",
    symbol: "⌘",
    description:
      "Plan improvements, prepare quotes and coordinate eligible fulfilment work.",
    outcome: "A path from insight to action",
  },
];

const TOOLKIT: {
  title: string;
  description: string;
  status: ToolkitStatus;
}[] = [
  {
    title: "Geographic discovery",
    description: "Explore local markets and business opportunities by area.",
    status: "live",
  },
  {
    title: "Visibility scoring",
    description: "Bring available Maps and website signals into one assessment.",
    status: "live",
  },
  {
    title: "Opportunity previews",
    description: "Inspect available business information and identified gaps.",
    status: "live",
  },
  {
    title: "Fix plans and quotes",
    description: "Translate identified issues into structured service proposals.",
    status: "live",
  },
  {
    title: "AI pitch assistance",
    description: "Prepare prospect-specific outreach using available information.",
    status: "live",
  },
  {
    title: "Pipeline management",
    description: "Organise leads, conversations, notes and sales progress.",
    status: "live",
  },
  {
    title: "Fulfilment workflow",
    description: "Submit eligible work for review and approval.",
    status: "beta",
  },
  {
    title: "CFO Intelligence",
    description: "Explore cashflow and financial management workflows.",
    status: "beta",
  },
  {
    title: "Keja Management",
    description: "Explore rental operations and landlord tools.",
    status: "beta",
  },
  {
    title: "Payment automation",
    description: "Future payment collection and transaction integrations.",
    status: "planned",
  },
  {
    title: "WhatsApp automation",
    description: "Planned follow-ups and messaging workflows.",
    status: "planned",
  },
  {
    title: "White-label reporting",
    description: "Planned branded client reports and shareable insights.",
    status: "planned",
  },
];

const PRICING = [
  {
    name: "Single opportunity",
    price: "KES 500",
    credits: "1 lead credit",
    description: "Unlock one business opportunity and explore the full lead details.",
    footer: "Start with one",
  },
  {
    name: "Active prospecting",
    price: "KES 2,500",
    credits: "5 lead credits",
    description: "Build a pipeline and work through several potential clients.",
    footer: "For consistent outreach",
  },
  {
    name: "Agency prospecting",
    price: "KES 6,000",
    credits: "12 lead credits",
    description: "More prospecting capacity for agencies and independent operators.",
    footer: "For higher-volume workflows",
    featured: true,
  },
];

const FAQ: readonly (readonly [string, string])[] = [
  [
    "What is GRIDSCOUT?",
    "GRIDSCOUT is a local commerce intelligence platform designed to help users discover businesses, assess digital visibility, identify opportunities and manage the journey from prospecting to service delivery.",
  ],
  [
    "Who is it built for?",
    "Digital agencies, SEO professionals, consultants, business operators and entrepreneurs who want a more structured way to find and work with business opportunities.",
  ],
  [
    "Can I explore before spending?",
    "Yes. You can explore the workspace and available previews. A lead credit is used when you unlock a lead and access its full opportunity details.",
  ],
  [
    "How much does a lead credit cost?",
    "The standard list price is KES 500 per credit. Credit bundles offer different effective rates.",
  ],
  [
    "Is GRIDSCOUT subscription-based?",
    "The lead-credit bundles use a usage-based pricing model. There is no recurring subscription for the bundles displayed on this page.",
  ],
  [
    "Are all modules fully operational?",
    "No. Services are labelled Live, Beta or Admin. Planned integrations such as automated payments and WhatsApp workflows should not be mistaken for active features.",
  ],
  [
    "Can I get help delivering client work?",
    "Eligible users can submit fulfilment requests. Requests are reviewed before acceptance, scope, pricing and delivery expectations are agreed.",
  ],
  [
    "Where does GRIDSCOUT operate?",
    "GRIDSCOUT is focused on Kenya. Geographic coverage depends on available and verified discovery data.",
  ],
];

/* -------------------------------------------------------------------------- */
/* Design system                                                              */
/* -------------------------------------------------------------------------- */

const SECTION = "mx-auto w-full max-w-7xl px-6 py-20 md:py-28";

const CTA =
  "inline-flex items-center justify-center gap-3 bg-scout-orange px-6 py-3.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0";

const OUTLINE_CTA =
  "inline-flex items-center justify-center gap-3 border border-border bg-background/40 px-6 py-3.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-foreground transition-all duration-200 hover:border-primary hover:text-primary";

const statusLabel: Record<ServiceStatus, string> = {
  live: "LIVE",
  beta: "BETA",
  admin: "ADMIN",
};

const statusClass: Record<ServiceStatus, string> = {
  live: "border-scout-mint/30 bg-scout-mint/10 text-scout-mint",
  beta: "border-scout-amber/30 bg-scout-amber/10 text-scout-amber",
  admin: "border-border bg-secondary text-muted-foreground",
};

const toolkitStatusClass: Record<ToolkitStatus, string> = {
  live: "text-scout-mint",
  beta: "text-scout-amber",
  planned: "text-muted-foreground",
};

/* -------------------------------------------------------------------------- */
/* Shared components                                                          */
/* -------------------------------------------------------------------------- */

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="h-px w-7 bg-primary" />
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-primary">
          {eyebrow}
        </span>
      </div>

      <h2 className="max-w-4xl font-display text-3xl font-extrabold uppercase leading-[1.02] tracking-[-0.045em] md:text-5xl">
        {title}
      </h2>

      {description && (
        <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
          {description}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-2 border px-2.5 py-1.5 font-mono text-[8px] font-bold tracking-[0.15em] ${statusClass[status]}`}
    >
      {status === "live" && (
        <span className="h-1.5 w-1.5 rounded-full bg-scout-mint shadow-[0_0_8px_currentColor]" />
      )}
      {statusLabel[status]}
    </span>
  );
}

function Metric({
  value,
  label,
  detail,
}: {
  value: string;
  label: string;
  detail?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="font-display text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
        {value}
      </div>
      <div className="mt-1 font-mono text-[8px] uppercase leading-relaxed tracking-[0.13em] text-muted-foreground sm:text-[9px]">
        {label}
      </div>
      {detail && (
        <div className="mt-1 text-[10px] text-muted-foreground/70">
          {detail}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Header                                                                     */
/* -------------------------------------------------------------------------- */

function SiteHeader({
  cta,
  signedIn,
}: {
  cta: string;
  signedIn: boolean;
}) {
  const links = [
    ["#services", "Platform"],
    ["#how-it-works", "Method"],
    ["#toolkit", "Toolkit"],
    ["#pricing", "Pricing"],
    ["#faq", "FAQ"],
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <div className="mx-auto flex max-w-7xl items-center gap-4 border border-white/10 bg-[#07110e]/90 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:rounded-full sm:px-5">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <RadarLogo size={26} />
          <span className="font-display text-sm font-extrabold uppercase tracking-[0.18em] text-white">
            GRID<span className="text-scout-mint">SCOUT</span>
          </span>
        </Link>

        <div className="hidden h-5 w-px bg-white/10 lg:block" />

        <nav className="hidden items-center gap-5 lg:flex">
          {links.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/55 transition-colors hover:text-scout-mint"
            >
              {label}
            </a>
          ))}
        </nav>

        <Link to={cta} className={`${CTA} ml-auto rounded-full px-5 py-2.5 text-[9px]`}>
          {signedIn ? "Open workspace" : "Get started"}
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                       */
/* -------------------------------------------------------------------------- */

function Hero({
  cta,
  signedIn,
}: {
  cta: string;
  signedIn: boolean;
}) {
  return (
    <section className="scanlines relative isolate flex min-h-[760px] items-center overflow-hidden bg-[#07110e] pb-20 pt-36 text-white md:min-h-dvh">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 55% 65% at 78% 38%, rgba(67,211,157,.15), transparent 70%), radial-gradient(ellipse 35% 45% at 5% 90%, rgba(232,163,61,.10), transparent 70%)",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(167,243,208,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(167,243,208,.25) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "linear-gradient(to bottom, black, transparent 85%)",
        }}
      />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-6 lg:grid-cols-[1.04fr_0.96fr] lg:gap-10">
        <div className="relative z-10">
          <div className="mb-8 inline-flex items-center gap-3 border border-scout-mint/20 bg-scout-mint/5 px-3 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-scout-mint opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-scout-mint" />
            </span>
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.17em] text-scout-mint">
              Local commerce intelligence / Kenya
            </span>
          </div>

          <h1 className="max-w-4xl font-display text-[clamp(3.2rem,7.4vw,7.2rem)] font-extrabold uppercase leading-[0.84] tracking-[-0.075em]">
            Know the
            <br />
            market.
            <br />
            <span
              className="text-scout-mint"
              style={{ textShadow: "0 0 45px rgba(110,231,183,.18)" }}
            >
              Find the
            </span>
            <br />
            opportunity.
          </h1>

          <p className="mt-8 max-w-xl text-sm leading-7 text-white/60 sm:text-base sm:leading-8">
            Discover businesses. Investigate digital visibility. Identify
            commercial opportunities. Turn market intelligence into meaningful
            client relationships — all from one connected workspace.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#services" className={CTA}>
              Explore the platform <span aria-hidden="true">↓</span>
            </a>

            <Link to={cta} className={OUTLINE_CTA}>
              {signedIn ? "Enter workspace" : "Create your account"}
              <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <div className="mt-14 grid max-w-xl grid-cols-3 gap-4 border-t border-white/10 pt-7">
            <Metric value="01" label="Connected workspace" detail="One operating environment" />
            <Metric value="04" label="Core workflow stages" detail="From discovery to delivery" />
            <Metric value="08" label="Platform modules" detail="Tools for the work ahead" />
          </div>

          <p className="mt-5 max-w-lg font-mono text-[8px] uppercase leading-relaxed tracking-[0.12em] text-white/35">
            Platform capabilities and availability are labelled individually.
            These are product descriptors, not live performance statistics.
          </p>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero visual — illustrative command interface                              */
/* -------------------------------------------------------------------------- */

function HeroVisual() {
  const radarPoints = [
    { x: "24%", y: "29%", tone: "bg-scout-mint", size: "h-2 w-2" },
    { x: "70%", y: "22%", tone: "bg-scout-amber", size: "h-2 w-2" },
    { x: "78%", y: "66%", tone: "bg-scout-mint", size: "h-2.5 w-2.5" },
    { x: "35%", y: "76%", tone: "bg-scout-orange", size: "h-2 w-2" },
    { x: "55%", y: "43%", tone: "bg-white", size: "h-1.5 w-1.5" },
    { x: "17%", y: "59%", tone: "bg-scout-amber", size: "h-1.5 w-1.5" },
    { x: "61%", y: "84%", tone: "bg-scout-mint", size: "h-1.5 w-1.5" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-10 rounded-full opacity-50 blur-3xl"
        style={{ background: "rgba(52,211,153,.13)" }}
      />

      <div className="relative overflow-hidden border border-white/10 bg-[#0c1914] shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <RadarLogo size={25} />
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white">
                GRIDSCOUT / COMMAND
              </div>
              <div className="mt-1 font-mono text-[8px] uppercase tracking-wider text-white/40">
                Intelligence environment
              </div>
            </div>
          </div>
          <span className="border border-scout-mint/20 bg-scout-mint/5 px-2 py-1 font-mono text-[8px] uppercase tracking-wider text-scout-mint">
            Product overview
          </span>
        </div>

        <div className="relative overflow-hidden bg-[#09140f] p-5 sm:p-7">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(rgba(110,231,183,.13) 1px, transparent 1px), linear-gradient(90deg, rgba(110,231,183,.13) 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />

          <div className="relative flex items-center justify-between">
            <div>
              <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/45">
                Market intelligence
              </div>
              <div className="mt-1 font-display text-lg font-bold uppercase text-white">
                Opportunity radar
              </div>
            </div>
            <span className="font-mono text-[8px] uppercase tracking-wider text-scout-amber">
              Concept visual
            </span>
          </div>

          <div className="relative mx-auto mt-8 flex aspect-square w-full max-w-[290px] items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-scout-mint/15" />
            <div className="absolute inset-[12%] rounded-full border border-scout-mint/20" />
            <div className="absolute inset-[25%] rounded-full border border-scout-mint/25" />
            <div className="absolute inset-[38%] rounded-full border border-scout-mint/30" />

            <div
              className="absolute inset-0 rounded-full border-t border-scout-mint/80"
              style={{ animation: "radar-sweep 6s linear infinite" }}
            />

            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-scout-mint/10" />
            <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-scout-mint/10" />

            {radarPoints.map((point, index) => (
              <span
                key={index}
                className={`absolute rounded-full shadow-[0_0_15px_currentColor] ${point.size} ${point.tone}`}
                style={{ left: point.x, top: point.y }}
              />
            ))}

            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-scout-mint/30 bg-scout-mint/10">
              <div className="h-3 w-3 rounded-full bg-scout-mint shadow-[0_0_20px_rgba(110,231,183,.8)]" />
            </div>
          </div>

          <div className="relative mt-7 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
            {[
              ["01", "Discover"],
              ["02", "Assess"],
              ["03", "Connect"],
            ].map(([number, label]) => (
              <div key={number}>
                <div className="font-mono text-[8px] font-bold text-scout-mint">
                  {number}
                </div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-white/75">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-white/10">
          <div className="bg-[#0c1914] p-5">
            <div className="font-mono text-[8px] uppercase tracking-[0.15em] text-white/40">
              Built around
            </div>
            <div className="mt-2 font-display text-base font-bold uppercase text-white">
              Local intelligence
            </div>
          </div>
          <div className="bg-[#0c1914] p-5">
            <div className="font-mono text-[8px] uppercase tracking-[0.15em] text-white/40">
              Designed for
            </div>
            <div className="mt-2 font-display text-base font-bold uppercase text-scout-mint">
              Commercial action
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center font-mono text-[8px] uppercase tracking-[0.12em] text-white/35">
        Illustrative interface / Not a live discovery map
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Service directory                                                          */
/* -------------------------------------------------------------------------- */

function ServiceCard({
  service,
  user,
}: {
  service: Service;
  user: { role?: string } | null | undefined;
}) {
  const isAdmin = user?.role === "admin";
  const restricted = service.status === "admin" && !isAdmin;
  const destination = restricted ? "/app" : service.route;

  return (
    <Link
      to={destination}
      className={`group relative flex min-h-[290px] flex-col overflow-hidden border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:bg-secondary/50 sm:p-7 ${
        service.featured
          ? "border-primary/50 shadow-[inset_0_2px_0_hsl(var(--primary)/0.65)]"
          : "border-border"
      }`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full border border-primary/10 transition-transform duration-500 group-hover:scale-125"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center border border-primary/25 bg-primary/10 font-display text-2xl text-primary transition-colors group-hover:bg-primary group-hover:text-background">
          {service.symbol}
        </div>
        <StatusBadge status={service.status} />
      </div>

      <div className="relative mt-8">
        <div className="font-mono text-[8px] font-bold uppercase tracking-[0.17em] text-primary">
          MODULE / {service.number} — {service.category}
        </div>

        <h3 className="mt-3 font-display text-xl font-extrabold uppercase tracking-tight sm:text-2xl">
          {service.name}
        </h3>

        <p className="mt-3 text-sm font-medium leading-relaxed text-foreground/90">
          {service.description}
        </p>

        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {service.detail}
        </p>
      </div>

      <div className="relative mt-auto flex items-center justify-between border-t border-border pt-5 mt-7">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-primary transition-colors group-hover:text-scout-mint">
          {restricted ? "Administrator access required" : "Explore module"}
        </span>
        <span className="text-lg text-primary transition-transform group-hover:translate-x-1">
          ↗
        </span>
      </div>
    </Link>
  );
}

function ServiceHub({
  user,
}: {
  user: { role?: string } | null | undefined;
}) {
  return (
    <section id="services" className="hairline-t bg-card/30">
      <div className={SECTION}>
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading
            eyebrow="The GRIDSCOUT ecosystem"
            title={
              <>
                One grid.
                <br />
                <span className="text-primary">Multiple ways to grow.</span>
              </>
            }
            description="A connected environment for market discovery, digital intelligence, sales operations and business management. Start with the tool you need and expand as your work grows."
          />

          <div className="max-w-xs border-l-2 border-primary pl-4">
            <div className="font-mono text-[9px] font-bold uppercase tracking-[0.16em]">
              Platform directory
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Each module carries an availability label. Live, beta and administrator tools are clearly distinguished.
            </p>
          </div>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service) => (
            <ServiceCard key={service.number} service={service} user={user} />
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-5 border border-border bg-background/70 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <div className="font-display text-lg font-extrabold uppercase">
              Your next move starts here.
            </div>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Enter your GRIDSCOUT workspace and explore the tools available to your account.
            </p>
          </div>
          <Link to={user ? "/app" : "/login"} className={`${CTA} shrink-0`}>
            {user ? "Open workspace" : "Create an account"}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Workflow                                                                   */
/* -------------------------------------------------------------------------- */

function WorkflowSection() {
  return (
    <section id="how-it-works" className="hairline-t">
      <div className={SECTION}>
        <SectionHeading
          eyebrow="The GRIDSCOUT method"
          title={
            <>
              From market signals
              <br />
              to <span className="text-primary">meaningful action.</span>
            </>
          }
          description="The platform is organised around a practical commercial workflow. Each stage helps move an opportunity closer to a decision."
        />

        <div className="mt-12 grid gap-px border border-border bg-border md:grid-cols-4">
          {WORKFLOW.map((item, index) => (
            <div
              key={item.number}
              className="group relative bg-card p-7 transition-colors hover:bg-secondary/60 sm:p-8"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-primary">
                  STAGE / {item.number}
                </span>
                <span className="font-display text-2xl text-primary/70 transition-transform group-hover:scale-110">
                  {item.symbol}
                </span>
              </div>

              <h3 className="mt-9 font-display text-2xl font-extrabold uppercase">
                {item.title}
              </h3>

              <p className="mt-4 min-h-[88px] text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>

              <div className="mt-6 border-t border-border pt-4">
                <div className="font-mono text-[8px] uppercase tracking-wider text-scout-mint">
                  Intended outcome
                </div>
                <p className="mt-2 text-xs font-semibold text-foreground/80">
                  {item.outcome}
                </p>
              </div>

              {index < WORKFLOW.length - 1 && (
                <span className="absolute -right-2.5 top-8 z-10 hidden h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-[10px] text-primary md:flex">
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Visibility engine                                                          */
/* -------------------------------------------------------------------------- */

function EngineSection() {
  const signals = [
    {
      number: "01",
      title: "Maps presence",
      weight: "45%",
      description:
        "Available business profile signals, ratings, reviews, photos, posts and responsiveness.",
    },
    {
      number: "02",
      title: "Web presence",
      weight: "55%",
      description:
        "Website availability, performance, mobile experience, metadata and available search visibility signals.",
    },
    {
      number: "03",
      title: "Commercial context",
      weight: "—",
      description:
        "Demand and business-value assumptions help frame opportunity estimates where sufficient information exists.",
    },
  ];

  return (
    <section className="hairline-t bg-card/30">
      <div className={`${SECTION} grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center`}>
        <div>
          <SectionHeading
            eyebrow="Inside the intelligence engine"
            title={
              <>
                Don't just find
                <br />
                businesses.
                <br />
                <span className="text-primary">Understand them.</span>
              </>
            }
          />

          <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground">
            A business listing is only the beginning. GRIDSCOUT is designed to
            bring available digital signals together, highlight areas worth
            investigating and help users decide what action to take next.
          </p>

          <p className="mt-4 max-w-xl text-xs leading-relaxed text-muted-foreground">
            Scores are assessment indicators, not search-engine rankings.
            Opportunity estimates depend on available information and
            assumptions; they are not guaranteed leads, revenue or results.
          </p>
        </div>

        <div className="space-y-3">
          {signals.map((signal) => (
            <div
              key={signal.number}
              className="group border border-border bg-card p-5 transition-colors hover:border-primary/40 sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] font-bold text-primary">
                    {signal.number}
                  </span>
                  <h3 className="font-display text-base font-bold uppercase tracking-wide">
                    {signal.title}
                  </h3>
                </div>
                <span className="font-mono text-sm font-bold text-scout-mint">
                  {signal.weight}
                </span>
              </div>

              <p className="mt-4 pl-8 text-sm leading-relaxed text-muted-foreground">
                {signal.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Toolkit                                                                    */
/* -------------------------------------------------------------------------- */

function ToolkitSection() {
  return (
    <section id="toolkit" className="hairline-t">
      <div className={SECTION}>
        <SectionHeading
          eyebrow="The operating toolkit"
          title={
            <>
              Built for the
              <br />
              <span className="text-primary">work behind growth.</span>
            </>
          }
          description="Beyond discovery, GRIDSCOUT brings together tools for assessment, sales, fulfilment and business operations."
        />

        <div className="mt-12 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {TOOLKIT.map((feature, index) => (
            <div
              key={feature.title}
              className="group bg-card p-6 transition-colors hover:bg-secondary/50 sm:p-7"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[8px] font-bold tracking-[0.15em] text-primary">
                  MODULE / {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={`font-mono text-[8px] font-bold uppercase tracking-[0.15em] ${toolkitStatusClass[feature.status]}`}
                >
                  {feature.status}
                </span>
              </div>

              <h3 className="mt-6 font-display text-base font-bold uppercase">
                {feature.title}
              </h3>

              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-5 text-center font-mono text-[8px] uppercase tracking-[0.13em] text-muted-foreground">
          Planned features are roadmap items, not active integrations.
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* ROI calculator                                                             */
/* -------------------------------------------------------------------------- */

function RoiSliderRow({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-4 font-mono text-[9px] uppercase tracking-wider">
        <label className="text-muted-foreground">{label}</label>
        <span className="font-bold tabular-nums text-foreground">
          {value.toLocaleString("en-KE")}
          {suffix}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full cursor-pointer accent-[hsl(var(--primary))]"
      />
    </div>
  );
}

function RoiCalculator({ to }: { to: string }) {
  const [leads, setLeads] = useState(20);
  const [closeRate, setCloseRate] = useState(10);
  const [retainer, setRetainer] = useState(25000);

  const clients = Math.round((leads * closeRate) / 100);
  const projectedBillings = clients * retainer;
  const creditSpend = leads * CREDIT_PRICE_KES;

  const money = (value: number) =>
    value.toLocaleString("en-KE", { maximumFractionDigits: 0 });

  return (
    <div className="grid overflow-hidden border border-border lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-8 bg-card p-6 sm:p-9">
        <div>
          <div className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.17em] text-primary">
            Build your scenario
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Adjust the assumptions to model a prospecting month. This is a
            planning exercise, not a prediction of actual sales.
          </p>
        </div>

        <RoiSliderRow
          label="Leads unlocked per month"
          value={leads}
          min={5}
          max={100}
          step={5}
          onChange={setLeads}
        />

        <RoiSliderRow
          label="Illustrative close rate"
          value={closeRate}
          min={2}
          max={30}
          step={1}
          suffix="%"
          onChange={setCloseRate}
        />

        <RoiSliderRow
          label="Monthly client retainer"
          value={retainer}
          min={5000}
          max={100000}
          step={2500}
          onChange={setRetainer}
        />

        <div className="border-t border-border pt-5">
          <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-muted-foreground">
            Illustrative lead-credit spend
          </div>
          <div className="mt-2 font-display text-2xl font-extrabold tabular-nums">
            KES {money(creditSpend)}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {leads} credits × KES {money(CREDIT_PRICE_KES)} standard list
            price. Bundle discounts and free credits are excluded.
          </p>
        </div>
      </div>

      <div className="scanlines flex flex-col justify-between gap-9 bg-[#0b1712] p-6 text-white sm:p-9">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">
            Illustrative scenario
          </div>

          <div className="mt-4 font-display text-5xl font-extrabold tabular-nums sm:text-6xl">
            {clients}
            <span className="ml-2 text-xl font-bold text-white/40">
              client{clients === 1 ? "" : "s"}
            </span>
          </div>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/55">
            Approximate new clients if the selected close rate is achieved,
            rounded to the nearest whole client.
          </p>
        </div>

        <div className="border border-scout-mint/25 bg-scout-mint/5 p-5">
          <div className="font-mono text-[8px] uppercase tracking-[0.15em] text-scout-mint">
            Illustrative monthly client billings
          </div>

          <div className="mt-3 font-display text-3xl font-extrabold tabular-nums text-white">
            KES {money(projectedBillings)}
          </div>

          <p className="mt-2 text-xs leading-relaxed text-white/45">
            Assumes every new client starts the selected monthly retainer.
          </p>
        </div>

        <div className="border-t border-white/10 pt-5">
          <p className="text-xs leading-relaxed text-white/45">
            Scenario only, not guaranteed income or profit. Excludes delivery
            costs, operating expenses, taxes, churn and clients who do not
            purchase a retainer.
          </p>

          <Link to={to} className={`${CTA} mt-5`}>
            Explore GRIDSCOUT <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function RoiSection({ cta }: { cta: string }) {
  return (
    <section id="roi" className="hairline-t bg-card/30">
      <div className={SECTION}>
        <SectionHeading
          eyebrow="The opportunity maths"
          title={
            <>
              Model the work.
              <br />
              <span className="text-primary">Know your assumptions.</span>
            </>
          }
          description="See how prospecting volume, conversion assumptions and client retainers could combine in a simple monthly scenario."
        />

        <div className="mt-12">
          <RoiCalculator to={cta} />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Pricing                                                                    */
/* -------------------------------------------------------------------------- */

function PricingSection({ cta }: { cta: string }) {
  return (
    <section id="pricing" className="hairline-t relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-10 h-[500px] w-[500px] rounded-full border border-primary/10"
      />

      <div className={`relative ${SECTION}`}>
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <SectionHeading
            eyebrow="Usage-based pricing"
            title={
              <>
                Invest in the
                <br />
                <span className="text-primary">opportunities</span>
                <br />
                you choose.
              </>
            }
          />

          <p className="max-w-xl text-sm leading-7 text-muted-foreground lg:justify-self-end">
            Explore the platform and available previews. Use a credit when you
            choose to unlock a lead and access its full details and available
            sales tools. No recurring lead-credit subscription.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {PRICING.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col border p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-8 ${
                tier.featured
                  ? "border-scout-orange/60 bg-secondary/70"
                  : "border-border bg-card"
              }`}
            >
              {tier.featured && (
                <span className="absolute right-5 top-5 border border-scout-orange/40 px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-wider text-scout-orange">
                  More capacity
                </span>
              )}

              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                {tier.name}
              </div>

              <div className="mt-8 font-display text-4xl font-extrabold tracking-tight">
                {tier.price}
              </div>

              <div className="mt-2 text-sm font-semibold text-primary">
                {tier.credits}
              </div>

              <div className="my-7 h-px bg-border" />

              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                {tier.description}
              </p>

              <div className="mt-8 border-t border-border pt-5 font-mono text-[8px] font-bold uppercase tracking-wider text-scout-mint">
                {tier.footer}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-5 border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <div className="font-display text-lg font-extrabold uppercase">
              Start exploring GRIDSCOUT
            </div>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              New accounts are intended to receive one free lead credit, subject
              to the account's applicable credit allocation.
            </p>
          </div>

          <Link to={cta} className={`${CTA} shrink-0`}>
            Get started <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <p className="mt-5 text-center font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
          KES pricing / Usage-based lead credits / Bundle rates shown above
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* FAQ                                                                        */
/* -------------------------------------------------------------------------- */

function FaqSection() {
  return (
    <section id="faq" className="hairline-t">
      <div className="mx-auto max-w-4xl px-6 py-20 md:py-28">
        <SectionHeading
          eyebrow="Questions and answers"
          title={
            <>
              Clear answers.
              <br />
              <span className="text-primary">No guesswork.</span>
            </>
          }
        />

        <div className="mt-12 divide-y divide-border border-y border-border">
          {FAQ.map(([question, answer], index) => (
            <details key={question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-display text-sm font-bold uppercase tracking-wide marker:hidden">
                <span>
                  <span className="mr-3 font-mono text-[9px] text-primary">
                    0{index + 1}
                  </span>
                  {question}
                </span>

                <span className="shrink-0 font-mono text-lg text-primary transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>

              <p className="mt-4 max-w-3xl pl-8 text-sm leading-relaxed text-muted-foreground">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Final call to action                                                       */
/* -------------------------------------------------------------------------- */

function FinalSection({
  cta,
  signedIn,
}: {
  cta: string;
  signedIn: boolean;
}) {
  return (
    <section className="hairline-t relative overflow-hidden bg-[#07110e] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 50% 100%, rgba(52,211,153,.14), transparent 70%)",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(167,243,208,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(167,243,208,.35) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-6 py-24 text-center md:py-32">
        <div className="mb-8 inline-flex items-center gap-3 border border-scout-mint/25 bg-scout-mint/5 px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-scout-mint" />
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-scout-mint">
            The grid is open
          </span>
        </div>

        <h2 className="font-display text-4xl font-extrabold uppercase leading-[0.98] tracking-[-0.05em] md:text-6xl">
          The next opportunity
          <br />
          is already out there.
          <br />
          <span className="text-scout-mint">Go find it.</span>
        </h2>

        <p className="mx-auto mt-7 max-w-xl text-sm leading-7 text-white/55 md:text-base">
          Explore the GRIDSCOUT ecosystem. Discover your next opportunity.
          Build stronger business relationships with better intelligence.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a href="#services" className={CTA}>
            Explore the platform <span aria-hidden="true">↓</span>
          </a>

          <Link to={cta} className={OUTLINE_CTA}>
            {signedIn ? "Open workspace" : "Create account"}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Footer                                                                     */
/* -------------------------------------------------------------------------- */

function SiteFooter() {
  return (
    <footer className="hairline-t bg-[#07110e] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-7 px-6 py-9 md:flex-row md:items-center md:justify-between">
        <Link to="/" className="flex items-center gap-3">
          <RadarLogo size={23} />
          <div>
            <div className="font-display text-xs font-extrabold uppercase tracking-[0.2em]">
              GRIDSCOUT
            </div>
            <div className="mt-1 font-mono text-[8px] uppercase tracking-wider text-white/40">
              Local commerce intelligence
            </div>
          </div>
        </Link>

        <div className="flex flex-wrap gap-x-5 gap-y-3 font-mono text-[8px] uppercase tracking-wider text-white/45">
          <a href="#services" className="transition-colors hover:text-scout-mint">Platform</a>
          <a href="#pricing" className="transition-colors hover:text-scout-mint">Pricing</a>
          <a href="#faq" className="transition-colors hover:text-scout-mint">FAQ</a>
          <Link to="/login" className="transition-colors hover:text-scout-mint">Sign in</Link>
          <Link to="/app" className="transition-colors hover:text-scout-mint">Workspace</Link>
        </div>

        <div className="font-mono text-[8px] uppercase tracking-wider text-white/35">
          Nairobi / Kenya / Built for local growth
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/* Homepage                                                                   */
/* -------------------------------------------------------------------------- */

export default function Home() {
  const { user } = useAuth();

  const signedIn = Boolean(user);
  const cta = signedIn ? "/app" : "/login";

  return (
    <main className="relative min-h-dvh overflow-x-clip bg-background">
      <SiteHeader cta={cta} signedIn={signedIn} />

      <Hero cta={cta} signedIn={signedIn} />

      <Ticker />

      <ServiceHub user={user} />

      <WorkflowSection />

      <EngineSection />

      <ToolkitSection />

      <RoiSection cta={cta} />

      <PricingSection cta={cta} />

      <FaqSection />

      <FinalSection cta={cta} signedIn={signedIn} />

      <SiteFooter />
    </main>
  );
}
