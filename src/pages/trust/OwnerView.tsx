
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  Eye,
  FileText,
  Globe2,
  Lightbulb,
  LockKeyhole,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";

import { trpc } from "@/providers/trpc";
import { TrustBadge } from "@/components/trust/TrustBadge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const COLORS = {
  forest: "#0B0E0C",
  panel: "#151A15",
  mint: "#B8F2D0",
  green: "#83C99B",
  gold: "#E8A33D",
  muted: "#8A8D80",
  border: "#26352C",
};

const fmt = (value: number) =>
  new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 0,
  }).format(value);

const cls = (...classes: (string | false | undefined | null)[]) =>
  classes.filter(Boolean).join(" ");

type TrustBand = "prime" | "stable" | "risky" | "unknown";

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBand(value: unknown): TrustBand {
  const normalized = String(value ?? "").toLowerCase();

  if (normalized === "prime") return "prime";
  if (normalized === "stable" || normalized === "trusted") return "stable";
  if (normalized === "risky" || normalized === "building") return "risky";

  return "unknown";
}

const BAND_META: Record<
  TrustBand,
  { label: string; description: string; color: string; dot: string }
> = {
  prime: {
    label: "PRIME",
    description: "Strong signals across your available trust indicators.",
    color: "border-[#83C99B]/30 bg-[#83C99B]/10 text-[#B8F2D0]",
    dot: "bg-[#83C99B]",
  },
  stable: {
    label: "STABLE",
    description: "Your business has a developing trust profile.",
    color: "border-[#E8A33D]/30 bg-[#E8A33D]/10 text-[#E8A33D]",
    dot: "bg-[#E8A33D]",
  },
  risky: {
    label: "NEEDS ATTENTION",
    description: "Some measured signals may need improvement.",
    color: "border-[#D97869]/30 bg-[#D97869]/10 text-[#E89A8D]",
    dot: "bg-[#D97869]",
  },
  unknown: {
    label: "AWAITING DATA",
    description: "There is not enough verified information to assess this profile.",
    color: "border-white/10 bg-white/5 text-[#A6B1A8]",
    dot: "bg-[#8A8D80]",
  },
};

function ScoreRing({
  total,
  band,
}: {
  total: number | null;
  band: TrustBand;
}) {
  const safeTotal =
    total === null ? 0 : Math.max(0, Math.min(1000, total));

  const percentage = safeTotal / 10;
  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  const dash = (percentage / 100) * circumference;

  const stroke =
    band === "prime"
      ? COLORS.green
      : band === "stable"
        ? COLORS.gold
        : band === "risky"
          ? "#D97869"
          : "#536158";

  return (
    <div className="relative h-[190px] w-[190px] shrink-0">
      <svg
        viewBox="0 0 160 160"
        className="-rotate-90 h-full w-full"
        role="img"
        aria-label={
          total === null
            ? "Trust score not yet available"
            : `Trust score ${safeTotal} out of 1000`
        }
      >
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="#26352C"
          strokeWidth="9"
        />
        {total !== null && (
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className="transition-all duration-1000"
          />
        )}
      </svg>

      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-4xl font-black tracking-tight text-[#F2F0E4]">
            {total === null ? "—" : fmt(safeTotal)}
          </div>
          <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.2em] text-[#8A8D80]">
            Trust index
          </div>
          <div className="mt-1 text-[10px] text-[#8A8D80]">
            {total === null ? "Not assessed" : "Out of 1,000"}
          </div>
        </div>
      </div>
    </div>
  );
}

function PillarCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
  status,
}: {
  icon: React.ElementType;
  label: string;
  value: number | null;
  hint: string;
  accent: string;
  status?: string;
}) {
  const safeValue =
    value === null ? null : Math.max(0, Math.min(100, value));

  return (
    <Card className="border-[#26352C] bg-[#111813] text-[#F2F0E4] shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className="grid h-10 w-10 place-items-center rounded-xl border"
            style={{
              color: accent,
              backgroundColor: `${accent}12`,
              borderColor: `${accent}30`,
            }}
          >
            <Icon size={19} />
          </div>

          {status && (
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#8A8D80]">
              {status}
            </span>
          )}
        </div>

        <div className="mt-5 text-[10px] font-mono uppercase tracking-[0.18em] text-[#8A8D80]">
          {label}
        </div>

        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-3xl font-black tracking-tight">
            {safeValue === null ? "—" : fmt(safeValue)}
          </span>
          <span className="text-xs text-[#8A8D80]">
            {safeValue === null ? "" : "/100"}
          </span>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#26352C]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${safeValue ?? 0}%`,
              backgroundColor: accent,
            }}
          />
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[#A6B1A8]">
          {hint}
        </p>
      </CardContent>
    </Card>
  );
}

function ActionCard({
  icon: Icon,
  number,
  title,
  description,
  tag,
}: {
  icon: React.ElementType;
  number: string;
  title: string;
  description: string;
  tag: string;
}) {
  return (
    <div className="group flex gap-4 rounded-xl border border-[#26352C] bg-[#111813] p-4 transition-all hover:border-[#83C99B]/40 hover:bg-[#151F18]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#83C99B]/10 font-mono text-xs font-bold text-[#B8F2D0]">
        {number}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-[#F2F0E4]">{title}</h3>
          <Badge className="border border-[#26352C] bg-[#1A241D] text-[9px] text-[#A6B1A8] hover:bg-[#1A241D]">
            {tag}
          </Badge>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[#8A8D80]">
          {description}
        </p>
      </div>

      <ChevronRight
        size={16}
        className="mt-1 shrink-0 text-[#536158] transition-transform group-hover:translate-x-1 group-hover:text-[#B8F2D0]"
      />
    </div>
  );
}

function DataStatus({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-[#26352C] bg-[#111813] p-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-[#8A8D80]">
        {label}
      </div>
      <div className="mt-2 text-xl font-black text-[#F2F0E4]">{value}</div>
      <div className="mt-1 text-xs text-[#8A8D80]">{description}</div>
    </div>
  );
}

export default function OwnerView() {
  const { id } = useParams();
  const businessId = Number(id);

  const [copyMessage, setCopyMessage] = useState("");

  const validBusinessId =
    Number.isInteger(businessId) && businessId > 0;

  const {
    data: score,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = trpc.trust.getScore.useQuery(
    { businessId } as any,
    { enabled: validBusinessId }
  );

  const s: any = score ?? {};
  const nested = s?.score ?? {};

  const rawTotal =
    asNumber(s?.total) ??
    asNumber(nested?.total);

  const rawBand = s?.band ?? nested?.band;
  const band = normalizeBand(rawBand);

  const total =
    rawTotal === null
      ? null
      : Math.max(0, Math.min(1000, rawTotal));

  const visibility =
    asNumber(s?.visibility) ??
    asNumber(nested?.visibility);

  const responsiveness =
    asNumber(s?.responsiveness) ??
    asNumber(nested?.responsiveness) ??
    asNumber(s?.responseRate);

  const financial =
    asNumber(s?.financial) ??
    asNumber(nested?.financial);

  const txCount =
    asNumber(s?.txCount) ??
    asNumber(s?.transactions?.length) ??
    0;

  const callCount = asNumber(s?.callCount) ?? 0;

  const businessName =
    s?.businessName ??
    s?.business?.name ??
    `Business #${businessId}`;

  const meta = BAND_META[band];

  const financialMature = txCount >= 10;
  const needTx = Math.max(0, 10 - txCount);
  const needCalls = Math.max(0, 5 - callCount);

  const hasAnyEvidence =
    visibility !== null ||
    responsiveness !== null ||
    (financial !== null && financialMature);

  const profileStatus =
    total !== null && band !== "unknown"
      ? meta.label
      : "AWAITING DATA";

  const actions = useMemo(() => {
    const list: {
      icon: typeof Eye;
      title: string;
      description: string;
      tag: string;
    }[] = [];

    if (visibility === null) {
      list.push({
        icon: Globe2,
        title: "Build your visibility evidence",
        description:
          "Connect and review your business visibility signals before drawing conclusions about your online presence.",
        tag: "DATA NEEDED",
      });
    } else if (visibility < 60) {
      list.push({
        icon: Eye,
        title: "Strengthen your digital presence",
        description:
          "Review your business photos, reviews, profile completeness and published updates.",
        tag: "VISIBILITY",
      });
    }

    if (responsiveness === null) {
      list.push({
        icon: Phone,
        title: "Establish customer response tracking",
        description:
          "Response data is not available yet. Build a reliable record of how customer enquiries are handled.",
        tag: "DATA NEEDED",
      });
    } else if (responsiveness < 70) {
      list.push({
        icon: Activity,
        title: "Improve customer responsiveness",
        description:
          "Review missed calls and unanswered enquiries. Create a consistent process for responding to customers.",
        tag: "CUSTOMER CARE",
      });
    }

    if (!financialMature) {
      list.push({
        icon: Wallet,
        title: "Build your financial activity history",
        description:
          `You have ${fmt(txCount)} recorded transactions. ${fmt(needTx)} more are needed to reach the initial 10-transaction activity threshold.`,
        tag: "FINANCIAL DATA",
      });
    } else if (financial !== null && financial < 60) {
      list.push({
        icon: BarChart3,
        title: "Review financial activity patterns",
        description:
          "Examine transaction consistency and cash movement. This indicator is not a measure of profit or creditworthiness.",
        tag: "FINANCIAL ACTIVITY",
      });
    }

    if (list.length === 0) {
      list.push({
        icon: Target,
        title: "Keep your business information current",
        description:
          "Review your business profile regularly and keep your visibility, customer response and financial records up to date.",
        tag: "MAINTENANCE",
      });
    }

    return list.slice(0, 3);
  }, [
    visibility,
    responsiveness,
    financial,
    financialMature,
    txCount,
    needTx,
  ]);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyMessage("Report link copied.");
    } catch {
      setCopyMessage("Unable to copy automatically. Copy the page URL from your browser.");
    }
  }

  if (!validBusinessId) {
    return (
      <div className="min-h-screen bg-[#0B0E0C] p-6 text-[#F2F0E4]">
        <div className="mx-auto max-w-xl rounded-2xl border border-[#26352C] bg-[#111813] p-8 text-center">
          <XCircle className="mx-auto text-[#D97869]" size={32} />
          <h1 className="mt-4 text-xl font-bold">Invalid business profile</h1>
          <p className="mt-2 text-sm text-[#8A8D80]">
            The business ID in this page address is not valid.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0E0C] p-6 text-[#F2F0E4]">
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="h-6 w-48 animate-pulse rounded bg-[#26352C]" />
          <div className="h-64 animate-pulse rounded-2xl border border-[#26352C] bg-[#111813]" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-40 animate-pulse rounded-xl border border-[#26352C] bg-[#111813]"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#0B0E0C] p-6 text-[#F2F0E4]">
        <div className="mx-auto max-w-xl rounded-2xl border border-[#26352C] bg-[#111813] p-8 text-center">
          <CircleHelp className="mx-auto text-[#E8A33D]" size={32} />
          <h1 className="mt-4 text-xl font-bold">Trust report unavailable</h1>
          <p className="mt-2 text-sm text-[#8A8D80]">
            We couldn't retrieve this business profile. Check the business ID or try again.
          </p>
          <Button
            onClick={() => refetch()}
            className="mt-5 bg-[#B8F2D0] font-bold text-[#0B0E0C] hover:bg-[#83C99B]"
          >
            <RefreshCw size={15} className="mr-2" />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E0C] px-4 py-5 text-[#F2F0E4] md:px-7 md:py-8">
      <div className="mx-auto max-w-6xl space-y-7">

        {/* TOP BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-[0.2em] text-[#B8F2D0]">
              <ShieldCheck size={15} />
              GRIDSCOUT / TRUST INTELLIGENCE
            </div>
            <div className="mt-2 text-xs text-[#8A8D80]">
              BUSINESS PROFILE / {businessId}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="border-[#26352C] bg-[#111813] text-[#A6B1A8] hover:bg-[#1A241D] hover:text-[#F2F0E4]"
            >
              <RefreshCw
                size={14}
                className={cls("mr-2", isFetching && "animate-spin")}
              />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="border-[#26352C] bg-[#111813] text-[#A6B1A8] hover:bg-[#1A241D] hover:text-[#F2F0E4]"
            >
              <Copy size={14} className="mr-2" />
              Share profile
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="border-[#26352C] bg-[#111813] text-[#A6B1A8] hover:bg-[#1A241D] hover:text-[#F2F0E4]"
            >
              <FileText size={14} className="mr-2" />
              Print
            </Button>
          </div>
        </div>

        {copyMessage && (
          <div className="flex items-center justify-between rounded-lg border border-[#83C99B]/20 bg-[#83C99B]/10 px-4 py-2 text-xs text-[#B8F2D0]">
            {copyMessage}
            <button
              onClick={() => setCopyMessage("")}
              aria-label="Dismiss message"
            >
              <XCircle size={14} />
            </button>
          </div>
        )}

        {/* HERO */}
        <section className="relative overflow-hidden rounded-2xl border border-[#34483A] bg-gradient-to-br from-[#18251B] via-[#101812] to-[#0B0E0C]">
          <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-[#83C99B]/[0.07] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-[#E8A33D]/[0.05] blur-3xl" />

          <div className="relative grid gap-7 p-6 md:grid-cols-[220px_1fr] md:items-center md:p-9">
            <div className="flex justify-center md:justify-start">
              <ScoreRing total={total} band={band} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cls("border px-3 py-1 text-[10px] tracking-widest", meta.color)}>
                  <span className={cls("mr-2 inline-block h-1.5 w-1.5 rounded-full", meta.dot)} />
                  {meta.label}
                </Badge>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#8A8D80]">
                  BUSINESS TRUST PROFILE
                </span>
              </div>

              <h1 className="mt-4 break-words text-2xl font-black tracking-tight md:text-4xl">
                {businessName}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#A6B1A8]">
                {total === null
                  ? "Your trust profile is waiting for sufficient verified evidence. Missing information is shown as unknown, not treated as failure."
                  : meta.description}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-[#8A8D80]">
                    Profile status
                  </div>
                  <div className="mt-1 text-xs font-bold text-[#F2F0E4]">
                    {profileStatus}
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-[#8A8D80]">
                    Financial activity
                  </div>
                  <div className="mt-1 text-xs font-bold text-[#F2F0E4]">
                    {fmt(txCount)} transactions
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-[#8A8D80]">
                    Response records
                  </div>
                  <div className="mt-1 text-xs font-bold text-[#F2F0E4]">
                    {fmt(callCount)} calls
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 text-[10px] text-[#8A8D80]">
                <LockKeyhole size={12} />
                Profile assessment is subject to available data and verification.
              </div>
            </div>
          </div>
        </section>

        {/* TRUST PILLARS */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#83C99B]">
                THE TRUST FRAMEWORK
              </div>
              <h2 className="mt-1 text-xl font-black tracking-tight">
                Three pillars. One business profile.
              </h2>
              <p className="mt-1 text-xs text-[#8A8D80]">
                Understand the signals behind your business profile.
              </p>
            </div>
            <Badge className="border border-[#26352C] bg-[#111813] text-[#A6B1A8]">
              EVIDENCE-BASED
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <PillarCard
              icon={Globe2}
              label="Digital visibility"
              value={visibility}
              accent={COLORS.mint}
              status={visibility === null ? "NO DATA" : "AVAILABLE"}
              hint="Online presence, profile completeness, photos, reviews and other visibility signals."
            />

            <PillarCard
              icon={Phone}
              label="Customer responsiveness"
              value={responsiveness}
              accent={COLORS.gold}
              status={responsiveness === null ? "NO DATA" : "AVAILABLE"}
              hint="Available call and response records. A complete assessment needs sufficient activity."
            />

            <PillarCard
              icon={Wallet}
              label="Financial activity"
              value={financialMature ? financial : null}
              accent="#83C99B"
              status={
                financialMature
                  ? "ACTIVITY THRESHOLD MET"
                  : "BUILDING HISTORY"
              }
              hint={
                financialMature
                  ? "An activity indicator based on recorded transactions. Not a measure of profit, solvency or creditworthiness."
                  : `${fmt(needTx)} more recorded transactions needed to reach the initial 10-transaction threshold.`
              }
            />
          </div>
        </section>

        {/* DATA COVERAGE */}
        <section className="space-y-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#83C99B]">
              PROFILE COMPLETENESS
            </div>
            <h2 className="mt-1 text-xl font-black">Build your evidence base</h2>
            <p className="mt-1 text-xs text-[#8A8D80]">
              More reliable records help create a more informative profile.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DataStatus
              label="Financial activity records"
              value={`${fmt(txCount)} / 10`}
              description={
                needTx > 0
                  ? `${fmt(needTx)} more transactions to reach the initial activity threshold.`
                  : "Initial transaction activity threshold reached."
              }
            />

            <DataStatus
              label="Customer response records"
              value={`${fmt(callCount)} / 5`}
              description={
                needCalls > 0
                  ? `${fmt(needCalls)} more call records to reach the initial activity threshold.`
                  : "Initial call activity threshold reached."
              }
            />
          </div>

          <div className="rounded-xl border border-[#26352C] bg-[#111813] p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#E8A33D]/10 text-[#E8A33D]">
                <CircleHelp size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold">A note about missing information</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#8A8D80]">
                  An unavailable indicator does not mean your business is performing poorly.
                  It means GRIDSCOUT does not yet have enough information to make that assessment.
                  Activity thresholds are data-completeness checks, not guarantees of a particular trust band.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* IMPROVEMENT ROADMAP */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#83C99B]">
                YOUR NEXT MOVES
              </div>
              <h2 className="mt-1 text-xl font-black">
                Business improvement roadmap
              </h2>
              <p className="mt-1 text-xs text-[#8A8D80]">
                Practical next steps based on the information currently available.
              </p>
            </div>
            <Badge className="border border-[#26352C] bg-[#111813] text-[#E8A33D]">
              <Sparkles size={11} className="mr-1" />
              ACTION PLAN
            </Badge>
          </div>

          <div className="space-y-3">
            {actions.map((action, index) => (
              <ActionCard
                key={action.title}
                icon={action.icon}
                number={String(index + 1).padStart(2, "0")}
                title={action.title}
                description={action.description}
                tag={action.tag}
              />
            ))}
          </div>
        </section>

        {/* PRODUCT ECOSYSTEM */}
        <section className="space-y-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#83C99B]">
              THE GRIDSCOUT ECOSYSTEM
            </div>
            <h2 className="mt-1 text-xl font-black">
              More than a trust score.
            </h2>
            <p className="mt-1 text-xs text-[#8A8D80]">
              A growing toolkit for understanding and improving your business.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                icon: BarChart3,
                title: "Business intelligence",
                desc: "Understand your business signals, performance indicators and areas for improvement.",
                tag: "PLATFORM",
              },
              {
                icon: Globe2,
                title: "Digital visibility",
                desc: "Explore your online presence and discover opportunities to become easier to find.",
                tag: "PLATFORM",
              },
              {
                icon: Wallet,
                title: "Financial intelligence",
                desc: "Build a clearer picture of transaction activity and business cash movement.",
                tag: "CFO",
              },
              {
                icon: Phone,
                title: "Customer experience",
                desc: "Understand customer enquiry patterns and improve the way your business responds.",
                tag: "OPERATIONS",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-[#26352C] bg-[#111813] p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#83C99B]/10 text-[#B8F2D0]">
                    <item.icon size={19} />
                  </div>
                  <span className="text-[9px] font-mono tracking-widest text-[#8A8D80]">
                    {item.tag}
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-bold">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#8A8D80]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* SUBSCRIPTION PREVIEW */}
        <section className="relative overflow-hidden rounded-2xl border border-[#66502C] bg-gradient-to-br from-[#201B11] via-[#151710] to-[#0D110D] p-6 md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#E8A33D]/[0.08] blur-3xl" />

          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge className="border border-[#E8A33D]/30 bg-[#E8A33D]/10 text-[#E8A33D]">
                <Sparkles size={11} className="mr-1" />
                GRIDSCOUT PRO
              </Badge>
              <span className="text-[9px] font-mono tracking-widest text-[#8A8D80]">
                FEATURE PREVIEW
              </span>
            </div>

            <h2 className="mt-5 text-2xl font-black tracking-tight">
              Take your business intelligence further.
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#A6B1A8]">
              The vision is a connected workspace for business reporting,
              actionable recommendations and customer operations.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: FileText,
                  title: "Advanced reports",
                  desc: "Deeper business insights and shareable reporting.",
                },
                {
                  icon: Phone,
                  title: "AI receptionist",
                  desc: "A future customer enquiry and response assistant.",
                },
                {
                  icon: BadgeCheck,
                  title: "Public trust profile",
                  desc: "A shareable business information and reputation page.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                >
                  <item.icon className="text-[#E8A33D]" size={19} />
                  <h3 className="mt-3 text-sm font-bold">{item.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#8A8D80]">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 pt-5">
              <LockKeyhole size={14} className="text-[#E8A33D]" />
              <p className="text-xs text-[#A6B1A8]">
                Subscription activation and payment integration will be introduced when the services are ready.
              </p>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#26352C] pt-5 text-[10px] text-[#718077]">
          <div className="flex items-center gap-2 font-mono tracking-widest">
            <ShieldCheck size={13} className="text-[#83C99B]" />
            GRIDSCOUT TRUST INTELLIGENCE
          </div>
          <div>
            Business insights, not a credit rating or lending decision.
          </div>
        </footer>
      </div>
    </div>
  );
}
