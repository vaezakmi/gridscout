
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  Gauge,
  Lightbulb,
  MessageSquareText,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from "lucide-react";

import { trpc } from "@/providers/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type Tab =
  | "overview"
  | "transactions"
  | "cashflow"
  | "planning"
  | "ai";

type Period = "7D" | "30D" | "90D";

type Transaction = {
  id: string;
  counterparty: string;
  amount: number;
  direction: "in" | "out";
  category: string;
  date: string;
  reference?: string;
};

const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: "DEMO-001",
    counterparty: "Naivas Supermarket",
    amount: 2500,
    direction: "out",
    category: "Stock & supplies",
    date: "2026-11-21T09:15:00",
  },
  {
    id: "DEMO-002",
    counterparty: "Customer payment",
    amount: 15000,
    direction: "in",
    category: "Sales",
    date: "2026-11-21T10:02:00",
  },
  {
    id: "DEMO-003",
    counterparty: "John Keja - Rent",
    amount: 1200,
    direction: "out",
    category: "Rent",
    date: "2026-11-20T18:00:00",
  },
  {
    id: "DEMO-004",
    counterparty: "Walk-in sales",
    amount: 8500,
    direction: "in",
    category: "Sales",
    date: "2026-11-20T14:30:00",
  },
  {
    id: "DEMO-005",
    counterparty: "Kenya Power",
    amount: 3200,
    direction: "out",
    category: "Utilities",
    date: "2026-11-19T11:20:00",
  },
  {
    id: "DEMO-006",
    counterparty: "Wholesale customer",
    amount: 22000,
    direction: "in",
    category: "Sales",
    date: "2026-11-18T16:10:00",
  },
  {
    id: "DEMO-007",
    counterparty: "Supplier payment",
    amount: 6800,
    direction: "out",
    category: "Stock & supplies",
    date: "2026-11-17T12:00:00",
  },
  {
    id: "DEMO-008",
    counterparty: "Customer payment",
    amount: 11500,
    direction: "in",
    category: "Sales",
    date: "2026-11-16T09:45:00",
  },
];

const DEMO_SMS = [
  "Confirmed. Ksh2,500.00 paid to NAIVAS SUPERMARKET on 21/11/26 at 9:15 AM. New M-PESA balance is Ksh18,420.00. Transaction cost, Ksh10.00.",
  "Confirmed. You have received Ksh15,000.00 from JAMES MWANGI 254712345678 on 21/11/26 at 10:02 AM. New M-PESA balance is Ksh33,420.00.",
  "Confirmed. Ksh1,200.00 paid to John Keja - Rent Nov on 20/11/26 at 6:00 PM.",
];

const fmtKes = (value: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);

const fmtCompact = (value: number) =>
  new Intl.NumberFormat("en-KE", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const cls = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

const NAV_ITEMS: Array<{
  id: Tab;
  label: string;
  icon: typeof Activity;
}> = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "transactions", label: "Transactions", icon: ReceiptText },
  { id: "cashflow", label: "Cashflow", icon: BarChart3 },
  { id: "planning", label: "Planning", icon: Target },
  { id: "ai", label: "AI CFO", icon: Sparkles },
];

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#83C99B]">
          {eyebrow}
        </p>
        <h2 className="text-xl font-bold tracking-tight text-[#F2F0E4] md:text-2xl">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-[#8A998E]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function MetricCard({
  label,
  value,
  caption,
  icon: Icon,
  tone = "mint",
}: {
  label: string;
  value: string;
  caption: string;
  icon: typeof Wallet;
  tone?: "mint" | "amber" | "red" | "neutral";
}) {
  const tones = {
    mint: {
      icon: "bg-[#83C99B]/10 text-[#83C99B]",
      value: "text-[#B8F2D0]",
    },
    amber: {
      icon: "bg-[#E8A33D]/10 text-[#E8A33D]",
      value: "text-[#E8C18B]",
    },
    red: {
      icon: "bg-[#D97869]/10 text-[#D97869]",
      value: "text-[#E9A094]",
    },
    neutral: {
      icon: "bg-white/5 text-[#AAB9AE]",
      value: "text-[#F2F0E4]",
    },
  };

  return (
    <Card className="border-[#263B30] bg-[#111A15] shadow-none">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A998E]">
              {label}
            </p>
            <p className={cls("mt-3 text-2xl font-black tracking-tight", tones[tone].value)}>
              {value}
            </p>
            <p className="mt-1 text-[11px] text-[#718178]">{caption}</p>
          </div>
          <div className={cls("rounded-xl p-2.5", tones[tone].icon)}>
            <Icon size={19} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Wallet;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[210px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#304538] bg-[#101812] px-6 py-8 text-center">
      <div className="mb-4 rounded-2xl bg-[#83C99B]/10 p-4 text-[#83C99B]">
        <Icon size={25} />
      </div>
      <h3 className="text-sm font-bold text-[#F2F0E4]">{title}</h3>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-[#8A998E]">
        {description}
      </p>
    </div>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const incoming = transaction.direction === "in";

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#26352C] py-3 last:border-0">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cls(
            "shrink-0 rounded-xl p-2.5",
            incoming
              ? "bg-[#83C99B]/10 text-[#83C99B]"
              : "bg-[#E8A33D]/10 text-[#E8A33D]",
          )}
        >
          {incoming ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#E8EDE8]">
            {transaction.counterparty}
          </p>
          <p className="mt-1 truncate text-[11px] text-[#7F9085]">
            {transaction.category} · {formatDate(transaction.date)}
          </p>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p
          className={cls(
            "text-sm font-bold tabular-nums",
            incoming ? "text-[#83C99B]" : "text-[#E8C18B]",
          )}
        >
          {incoming ? "+" : "−"}
          {fmtKes(transaction.amount)}
        </p>
        <p className="mt-1 text-[9px] uppercase tracking-wider text-[#718178]">
          {incoming ? "Money in" : "Money out"}
        </p>
      </div>
    </div>
  );
}

function CashflowChart({ demo }: { demo: boolean }) {
  const values = demo
    ? [
        { day: "Mon", income: 42, expense: 25 },
        { day: "Tue", income: 58, expense: 34 },
        { day: "Wed", income: 38, expense: 30 },
        { day: "Thu", income: 72, expense: 39 },
        { day: "Fri", income: 63, expense: 43 },
        { day: "Sat", income: 88, expense: 48 },
        { day: "Sun", income: 75, expense: 35 },
      ]
    : [];

  if (!demo) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Your cashflow story starts here"
        description="Add verified transactions to see income and spending trends over time. No sample figures are presented as actual business performance."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2 text-[#B8F2D0]">
          <span className="h-2 w-2 rounded-full bg-[#83C99B]" />
          Money in
        </div>
        <div className="flex items-center gap-2 text-[#E8C18B]">
          <span className="h-2 w-2 rounded-full bg-[#E8A33D]" />
          Money out
        </div>
        <Badge className="border-[#8A693A] bg-[#E8A33D]/10 text-[#E8C18B]">
          Illustrative demo
        </Badge>
      </div>

      <div className="flex h-48 items-end justify-between gap-3 border-b border-[#304538] px-2">
        {values.map((item) => (
          <div key={item.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div className="flex h-[85%] w-full items-end justify-center gap-1">
              <div
                className="w-3 rounded-t-md bg-[#83C99B] transition-all"
                style={{ height: `${item.income}%` }}
                title={`Income ${item.income}`}
              />
              <div
                className="w-3 rounded-t-md bg-[#E8A33D] transition-all"
                style={{ height: `${item.expense}%` }}
                title={`Expenses ${item.expense}`}
              />
            </div>
            <span className="pb-2 text-[10px] text-[#8A998E]">{item.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpendingBreakdown({ demo }: { demo: boolean }) {
  const categories = [
    { name: "Stock & supplies", amount: 9300, pct: 48, color: "#83C99B" },
    { name: "Rent", amount: 1200, pct: 15, color: "#E8A33D" },
    { name: "Utilities", amount: 3200, pct: 25, color: "#A6B4A9" },
    { name: "Other", amount: 800, pct: 12, color: "#D97869" },
  ];

  if (!demo) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="No spending breakdown yet"
        description="Categorised transactions will reveal where your money goes."
      />
    );
  }

  return (
    <div className="space-y-4">
      {categories.map((item) => (
        <div key={item.name}>
          <div className="mb-2 flex items-center justify-between gap-3 text-xs">
            <span className="text-[#D5DED6]">{item.name}</span>
            <span className="font-semibold text-[#F2F0E4]">
              {fmtKes(item.amount)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#26352C]">
            <div
              className="h-full rounded-full"
              style={{ width: `${item.pct}%`, backgroundColor: item.color }}
            />
          </div>
        </div>
      ))}
      <p className="pt-1 text-[10px] text-[#718178]">
        Illustrative spending categories — not actual business records.
      </p>
    </div>
  );
}

export default function CfoDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [period, setPeriod] = useState<Period>("30D");
  const [demoMode, setDemoMode] = useState(false);
  const [sms, setSms] = useState("");
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [search, setSearch] = useState("");
  const [parsedPreview, setParsedPreview] = useState<any>(null);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiNotice, setAiNotice] = useState("");

  // Temporary compatibility value. Replace when the business selector is connected.
  const businessId = 1;

  const {
    data: score,
    isLoading: scoreLoading,
    error: scoreError,
  } = trpc.trust.getScore.useQuery(
    { businessId } as any,
    { enabled: !!businessId },
  );

  const ingest = trpc.trust.ingestSms.useMutation({
    onSuccess: (data) => {
      setParsedPreview(data);
    },
  });

  const backendScore: any = score as any;

  // The current backend returns a prototype score only, not a transaction ledger.
  // Never treat that score as verified business financial performance.
  const backendTransactions: Transaction[] = Array.isArray(
    backendScore?.transactions,
  )
    ? backendScore.transactions
    : [];

  const transactions = demoMode
    ? DEMO_TRANSACTIONS
    : backendTransactions;

  const totals = useMemo(() => {
    const incoming = transactions
      .filter((t) => t.direction === "in")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const outgoing = transactions
      .filter((t) => t.direction === "out")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      incoming,
      outgoing,
      net: incoming - outgoing,
      count: transactions.length,
    };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesFilter =
        filter === "all" || transaction.direction === filter;

      const term = search.trim().toLowerCase();
      const matchesSearch =
        !term ||
        transaction.counterparty.toLowerCase().includes(term) ||
        transaction.category.toLowerCase().includes(term);

      return matchesFilter && matchesSearch;
    });
  }, [transactions, filter, search]);

  const canParse = sms.trim().length > 12 && !ingest.isPending;

  const parseSms = () => {
    setParsedPreview(null);
    ingest.mutate({ businessId, rawSms: sms } as any);
  };

  const loadDemoSms = (message: string) => {
    setSms(message);
    setParsedPreview(null);
  };

  const askAi = () => {
    if (!aiQuestion.trim()) return;
    setAiNotice(
      "The AI CFO interface is ready, but financial-data analysis is not connected yet. Your question has not been sent or analysed.",
    );
  };

  const demoBadge = demoMode ? (
    <Badge className="border-[#8A693A] bg-[#E8A33D]/10 text-[#E8C18B]">
      DEMO DATA
    </Badge>
  ) : (
    <Badge className="border-[#304538] bg-[#15221A] text-[#9EB5A4]">
      LIVE WORKSPACE
    </Badge>
  );

  return (
    <div className="min-h-screen bg-[#0B0E0C] text-[#F2F0E4]">
      <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-5 md:px-7 md:py-7">
        {/* BRAND HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#26352C] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#B8F2D0] text-[#0B0E0C]">
              <Activity size={23} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight">
                  GRIDSCOUT <span className="text-[#83C99B]">CFO</span>
                </h1>
                <Badge className="border-[#304538] bg-[#15221A] text-[9px] tracking-widest text-[#9EB5A4]">
                  BUSINESS INTELLIGENCE
                </Badge>
              </div>
              <p className="mt-0.5 text-[11px] tracking-wide text-[#7F9085]">
                YOUR BUSINESS. YOUR NUMBERS. YOUR NEXT MOVE.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {demoBadge}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDemoMode((value) => !value);
                setActiveTab("overview");
              }}
              className="border-[#304538] bg-[#111A15] text-[#D9E5DB] hover:bg-[#1B2A20]"
            >
              <Activity size={14} className="mr-2" />
              {demoMode ? "Exit demo" : "Explore demo"}
            </Button>
            <button
              type="button"
              className="rounded-xl border border-[#304538] bg-[#111A15] p-2.5 text-[#AAB9AE] hover:text-[#B8F2D0]"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={17} />
            </button>
          </div>
        </header>

        {/* INTRO */}
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#83C99B]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#83C99B]" />
              FINANCIAL COMMAND CENTRE
            </p>
            <h2 className="text-2xl font-black tracking-tight md:text-3xl">
              Know your numbers.
              <span className="text-[#83C99B]"> Own your growth.</span>
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[#8A998E]">
              Understand your cash movement, track business activity and make
              better decisions with one financial workspace.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <CalendarDays size={15} className="text-[#83C99B]" />
            <div className="flex rounded-xl border border-[#304538] bg-[#111A15] p-1">
              {(["7D", "30D", "90D"] as Period[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setPeriod(item)}
                  className={cls(
                    "rounded-lg px-3 py-1.5 text-xs font-bold transition",
                    period === item
                      ? "bg-[#B8F2D0] text-[#0B0E0C]"
                      : "text-[#8A998E] hover:text-white",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* NAVIGATION */}
        <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-[#26352C] bg-[#101712] p-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const selected = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cls(
                  "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition",
                  selected
                    ? "bg-[#B8F2D0] text-[#0B0E0C]"
                    : "text-[#8A998E] hover:bg-[#1B2A20] hover:text-[#F2F0E4]",
                )}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Money received"
                value={totals.count ? fmtKes(totals.incoming) : "KES —"}
                caption={
                  totals.count
                    ? "Recorded incoming transactions"
                    : "Awaiting financial records"
                }
                icon={ArrowDownLeft}
                tone="mint"
              />
              <MetricCard
                label="Money spent"
                value={totals.count ? fmtKes(totals.outgoing) : "KES —"}
                caption={
                  totals.count
                    ? "Recorded outgoing transactions"
                    : "Awaiting financial records"
                }
                icon={ArrowUpRight}
                tone="amber"
              />
              <MetricCard
                label="Net movement"
                value={totals.count ? fmtKes(totals.net) : "KES —"}
                caption="Income minus recorded outflow"
                icon={CircleDollarSign}
                tone={totals.net >= 0 ? "mint" : "red"}
              />
              <MetricCard
                label="Transactions"
                value={String(totals.count)}
                caption={
                  demoMode
                    ? "Illustrative demo records"
                    : "Available transaction records"
                }
                icon={ReceiptText}
                tone="neutral"
              />
            </section>

            {/* BUSINESS PULSE */}
            <Card className="overflow-hidden border-[#304538] bg-[#111A15] shadow-none">
              <CardContent className="p-0">
                <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
                  <div className="p-5 md:p-6">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="rounded-lg bg-[#83C99B]/10 p-2 text-[#83C99B]">
                        <Zap size={18} />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#83C99B]">
                        BUSINESS PULSE
                      </p>
                      <Badge className="ml-auto border-[#304538] bg-[#15221A] text-[#9EB5A4]">
                        {demoMode ? "DEMO INSIGHT" : "READY"}
                      </Badge>
                    </div>

                    <h3 className="text-xl font-bold text-[#F2F0E4]">
                      {demoMode
                        ? "Your sample business is moving."
                        : "Your financial intelligence starts here."}
                    </h3>

                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#91A196]">
                      {demoMode
                        ? "This sample workspace demonstrates how GRIDSCOUT CFO can bring incoming payments, operating expenses and business activity into one view."
                        : "Connect your transaction activity to start identifying spending patterns, tracking cash movement and uncovering opportunities to improve your business."}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => setActiveTab("transactions")}
                        className="bg-[#B8F2D0] font-bold text-[#0B0E0C] hover:bg-[#9DE5B8]"
                      >
                        Explore transactions
                        <ChevronRight size={15} className="ml-1" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTab("cashflow")}
                        className="border-[#304538] bg-transparent text-[#D9E5DB] hover:bg-[#1B2A20]"
                      >
                        View cashflow
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-[#26352C] bg-[#0D1510] p-5 lg:border-l lg:border-t-0 md:p-6">
                    <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A998E]">
                      FINANCIAL DATA COVERAGE
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border-[5px] border-[#304538] text-xl font-black text-[#B8F2D0]">
                        {totals.count}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#E5EDE6]">
                          {totals.count
                            ? "Records available"
                            : "Waiting for records"}
                        </p>
                        <p className="mt-1 text-xs text-[#7F9085]">
                          {demoMode
                            ? "Sample data only"
                            : "No verified ledger connected"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#26352C]">
                      <div
                        className="h-full rounded-full bg-[#83C99B]"
                        style={{
                          width: `${Math.min(100, totals.count * 10)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-[#718178]">
                      Record count is not a financial health or credit score.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
              <Card className="border-[#263B30] bg-[#111A15] shadow-none">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm text-[#F2F0E4]">
                        Cashflow movement
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs text-[#819187]">
                        Income versus expenses over time
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab("cashflow")}
                      className="text-[#83C99B] hover:bg-[#1B2A20] hover:text-[#B8F2D0]"
                    >
                      Details <ChevronRight size={14} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <CashflowChart demo={demoMode} />
                </CardContent>
              </Card>

              <Card className="border-[#263B30] bg-[#111A15] shadow-none">
                <CardHeader>
                  <CardTitle className="text-sm text-[#F2F0E4]">
                    Spending composition
                  </CardTitle>
                  <CardDescription className="text-xs text-[#819187]">
                    Where business money goes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SpendingBreakdown demo={demoMode} />
                </CardContent>
              </Card>
            </div>

            <Card className="border-[#263B30] bg-[#111A15] shadow-none">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm text-[#F2F0E4]">
                    Latest activity
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs text-[#819187]">
                    Recent business transactions
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("transactions")}
                  className="text-[#83C99B] hover:bg-[#1B2A20]"
                >
                  View all <ChevronRight size={14} />
                </Button>
              </CardHeader>
              <CardContent>
                {transactions.length ? (
                  transactions.slice(0, 5).map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon={ReceiptText}
                    title="Your activity feed is waiting"
                    description="Once transaction records are connected, your latest incoming payments and expenses will appear here."
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* TRANSACTIONS */}
        {activeTab === "transactions" && (
          <div className="space-y-5">
            <SectionHeading
              eyebrow="FINANCIAL OPERATIONS"
              title="Transaction intelligence"
              description="Review incoming payments, expenses and M-Pesa message previews."
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setActiveTab("overview");
                    setSms("");
                  }}
                  className="bg-[#B8F2D0] font-bold text-[#0B0E0C] hover:bg-[#9DE5B8]"
                >
                  <Plus size={15} className="mr-2" />
                  Back to overview
                </Button>
              }
            />

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <Card className="border-[#263B30] bg-[#111A15] shadow-none">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MessageSquareText className="text-[#83C99B]" size={19} />
                    <CardTitle className="text-sm text-[#F2F0E4]">
                      M-Pesa message intelligence
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs leading-relaxed text-[#819187]">
                    Paste an M-Pesa confirmation to inspect the parser result.
                    The current backend does not persist transactions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={sms}
                    onChange={(event) => {
                      setSms(event.target.value);
                      setParsedPreview(null);
                    }}
                    placeholder="Paste your M-Pesa confirmation message here..."
                    className="min-h-[135px] resize-y border-[#304538] bg-[#0B120D] font-mono text-xs text-[#E5EDE6] placeholder:text-[#65766B] focus-visible:ring-[#83C99B]"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] text-[#718178]">
                      {sms.length} characters
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSms("");
                          setParsedPreview(null);
                          ingest.reset();
                        }}
                        className="border-[#304538] bg-transparent text-[#AAB9AE]"
                      >
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        disabled={!canParse}
                        onClick={parseSms}
                        className="bg-[#B8F2D0] font-bold text-[#0B0E0C] hover:bg-[#9DE5B8]"
                      >
                        {ingest.isPending ? "Parsing..." : "Parse message"}
                        <ChevronRight size={14} className="ml-1" />
                      </Button>
                    </div>
                  </div>

                  {ingest.isError && (
                    <div className="rounded-xl border border-[#7A3932] bg-[#321B18] p-3 text-xs text-[#F0A49A]">
                      {ingest.error.message}
                    </div>
                  )}

                  {parsedPreview && (
                    <div className="rounded-xl border border-[#476B51] bg-[#14251A] p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#B8F2D0]">
                        <CheckCircle2 size={16} />
                        Message parsed successfully
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] uppercase text-[#8A998E]">
                            Amount
                          </p>
                          <p className="mt-1 font-bold text-[#F2F0E4]">
                            {typeof parsedPreview.amount === "number"
                              ? fmtKes(parsedPreview.amount)
                              : "Not returned"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-[#8A998E]">
                            Direction
                          </p>
                          <p className="mt-1 font-bold text-[#F2F0E4]">
                            {parsedPreview.type ?? "Not returned"}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[10px] uppercase text-[#8A998E]">
                            Counterparty
                          </p>
                          <p className="mt-1 font-bold text-[#F2F0E4]">
                            {parsedPreview.counterparty ?? "Not returned"}
                          </p>
                        </div>
                      </div>
                      <p className="mt-4 rounded-lg bg-[#0B120D] p-2.5 text-[10px] leading-relaxed text-[#E8C18B]">
                        Preview only. This message has not been saved to a
                        transaction ledger.
                      </p>
                    </div>
                  )}

                  <div className="border-t border-[#26352C] pt-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#8A998E]">
                      Try sample messages
                    </p>
                    <div className="space-y-2">
                      {DEMO_SMS.map((message, index) => (
                        <button
                          key={message}
                          onClick={() => loadDemoSms(message)}
                          className="w-full rounded-lg border border-[#304538] bg-[#0D1510] p-2.5 text-left text-[10px] leading-relaxed text-[#9BA99F] transition hover:border-[#83C99B]/60 hover:text-[#E5EDE6]"
                        >
                          <span className="mr-2 font-bold text-[#83C99B]">
                            SAMPLE {index + 1}
                          </span>
                          {message}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#263B30] bg-[#111A15] shadow-none">
                <CardHeader>
                  <CardTitle className="text-sm text-[#F2F0E4]">
                    Transaction ledger
                  </CardTitle>
                  <CardDescription className="text-xs text-[#819187]">
                    Search and filter available records
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative mb-3">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#718178]"
                    />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search transactions..."
                      className="border-[#304538] bg-[#0B120D] pl-9 text-xs text-[#E5EDE6] placeholder:text-[#65766B]"
                    />
                  </div>

                  <div className="mb-3 flex gap-1 rounded-xl bg-[#0B120D] p-1">
                    {(["all", "in", "out"] as const).map((item) => (
                      <button
                        key={item}
                        onClick={() => setFilter(item)}
                        className={cls(
                          "flex-1 rounded-lg py-2 text-xs font-semibold capitalize",
                          filter === item
                            ? "bg-[#B8F2D0] text-[#0B0E0C]"
                            : "text-[#8A998E] hover:text-white",
                        )}
                      >
                        {item === "all"
                          ? "All"
                          : item === "in"
                            ? "Money in"
                            : "Money out"}
                      </button>
                    ))}
                  </div>

                  {filteredTransactions.length ? (
                    <div className="max-h-[470px] overflow-y-auto">
                      {filteredTransactions.map((transaction) => (
                        <TransactionRow
                          key={transaction.id}
                          transaction={transaction}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={ReceiptText}
                      title="No matching transactions"
                      description="Try another search or switch the transaction filter. Your ledger will populate when records are available."
                    />
                  )}
                  {demoMode && (
                    <p className="mt-3 text-[10px] text-[#E8C18B]">
                      Sample transactions are illustrative demo data.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* CASHFLOW */}
        {activeTab === "cashflow" && (
          <div className="space-y-5">
            <SectionHeading
              eyebrow="PERFORMANCE ANALYTICS"
              title="Cashflow intelligence"
              description="Understand how money moves through your business."
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard
                label="Total inflow"
                value={totals.count ? fmtKes(totals.incoming) : "KES —"}
                caption="Recorded income"
                icon={TrendingUp}
                tone="mint"
              />
              <MetricCard
                label="Total outflow"
                value={totals.count ? fmtKes(totals.outgoing) : "KES —"}
                caption="Recorded expenses"
                icon={TrendingDown}
                tone="amber"
              />
              <MetricCard
                label="Net movement"
                value={totals.count ? fmtKes(totals.net) : "KES —"}
                caption="Inflow less outflow"
                icon={Activity}
                tone="neutral"
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
              <Card className="border-[#263B30] bg-[#111A15] shadow-none">
                <CardHeader>
                  <CardTitle className="text-sm text-[#F2F0E4]">
                    Income and expense trends
                  </CardTitle>
                  <CardDescription className="text-xs text-[#819187]">
                    {period} reporting window
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CashflowChart demo={demoMode} />
                </CardContent>
              </Card>

              <Card className="border-[#263B30] bg-[#111A15] shadow-none">
                <CardHeader>
                  <CardTitle className="text-sm text-[#F2F0E4]">
                    Expense composition
                  </CardTitle>
                  <CardDescription className="text-xs text-[#819187]">
                    Categorised business spending
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SpendingBreakdown demo={demoMode} />
                </CardContent>
              </Card>
            </div>

            <Card className="border-[#263B30] bg-[#111A15] shadow-none">
              <CardHeader>
                <CardTitle className="text-sm text-[#F2F0E4]">
                  Financial indicators
                </CardTitle>
                <CardDescription className="text-xs text-[#819187]">
                  Measures that become available as financial records grow
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                {[
                  {
                    icon: Wallet,
                    title: "Cash position",
                    text: "Requires a verified opening or current balance.",
                  },
                  {
                    icon: TrendingUp,
                    title: "Revenue trend",
                    text: "Requires dated incoming transactions.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Expense control",
                    text: "Requires categorised and reconciled expenses.",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-xl border border-[#304538] bg-[#0D1510] p-4"
                    >
                      <Icon size={19} className="mb-3 text-[#83C99B]" />
                      <p className="text-sm font-bold text-[#E5EDE6]">
                        {item.title}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-[#819187]">
                        {item.text}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {/* PLANNING */}
        {activeTab === "planning" && (
          <div className="space-y-5">
            <SectionHeading
              eyebrow="BUSINESS GROWTH"
              title="Plan your next move"
              description="Build financial discipline with targets, budgets and forward planning."
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  icon: Target,
                  title: "Revenue targets",
                  description:
                    "Set weekly and monthly sales goals and track progress against actual income.",
                  tag: "SALES",
                },
                {
                  icon: Wallet,
                  title: "Expense budgets",
                  description:
                    "Create spending limits for rent, stock, operations, utilities and other costs.",
                  tag: "CONTROL",
                },
                {
                  icon: CalendarDays,
                  title: "Supplier obligations",
                  description:
                    "Organise supplier payments and upcoming financial commitments.",
                  tag: "OPERATIONS",
                },
                {
                  icon: CircleDollarSign,
                  title: "Savings goals",
                  description:
                    "Set aside money for expansion, equipment, emergencies or working capital.",
                  tag: "GROWTH",
                },
                {
                  icon: BarChart3,
                  title: "Cashflow forecast",
                  description:
                    "Explore future cash requirements using verified income and expense history.",
                  tag: "FORECAST",
                },
                {
                  icon: FileText,
                  title: "Financial reports",
                  description:
                    "Prepare clear summaries for internal reviews, planning and record keeping.",
                  tag: "REPORTING",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.title}
                    className="border-[#263B30] bg-[#111A15] shadow-none"
                  >
                    <CardContent className="p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="rounded-xl bg-[#83C99B]/10 p-3 text-[#83C99B]">
                          <Icon size={21} />
                        </div>
                        <Badge className="border-[#304538] bg-[#15221A] text-[9px] tracking-wider text-[#9EB5A4]">
                          {item.tag}
                        </Badge>
                      </div>
                      <h3 className="text-sm font-bold text-[#F2F0E4]">
                        {item.title}
                      </h3>
                      <p className="mt-2 min-h-[55px] text-xs leading-relaxed text-[#819187]">
                        {item.description}
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-[10px] font-semibold text-[#83C99B]">
                        PLANNING MODULE
                        <ChevronRight size={13} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="rounded-2xl border border-[#69512E] bg-[#241D12] p-5">
              <div className="flex items-start gap-3">
                <Lightbulb className="mt-0.5 shrink-0 text-[#E8A33D]" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-[#E8C18B]">
                    Planning with real numbers
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#B5A487]">
                    Budgets and forecasts should be based on your actual
                    transaction history and obligations. These planning
                    modules are currently interface previews, not active
                    financial calculations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI CFO */}
        {activeTab === "ai" && (
          <div className="space-y-5">
            <SectionHeading
              eyebrow="INTELLIGENCE ASSISTANT"
              title="Meet your AI CFO"
              description="A future decision-support layer grounded in your business financial records."
            />

            <Card className="overflow-hidden border-[#304538] bg-[#111A15] shadow-none">
              <CardContent className="p-0">
                <div className="border-b border-[#26352C] bg-gradient-to-r from-[#14251A] to-[#111A15] p-6 md:p-8">
                  <div className="mb-4 inline-flex rounded-2xl bg-[#83C99B]/10 p-3 text-[#83C99B]">
                    <Sparkles size={25} />
                  </div>
                  <h3 className="text-2xl font-black text-[#F2F0E4]">
                    Ask better questions.
                    <span className="block text-[#83C99B]">
                      Make smarter decisions.
                    </span>
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#91A196]">
                    Imagine asking where your money is going, which expenses
                    are rising, or whether your sales are keeping pace with
                    your operating costs.
                  </p>
                </div>

                <div className="space-y-4 p-5 md:p-7">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8A998E]">
                    QUESTIONS TO EXPLORE
                  </p>

                  <div className="grid gap-2 md:grid-cols-2">
                    {[
                      "Which expenses are taking the most money?",
                      "How much did my business receive this month?",
                      "What should I review before paying suppliers?",
                      "Is my revenue growing consistently?",
                    ].map((question) => (
                      <button
                        key={question}
                        onClick={() => {
                          setAiQuestion(question);
                          setAiNotice("");
                        }}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#304538] bg-[#0D1510] p-3 text-left text-xs text-[#C5D2C8] transition hover:border-[#83C99B]/60 hover:bg-[#15221A]"
                      >
                        {question}
                        <ChevronRight
                          size={14}
                          className="shrink-0 text-[#83C99B]"
                        />
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3 rounded-2xl border border-[#304538] bg-[#0D1510] p-4">
                    <label className="text-xs font-semibold text-[#D5DED6]">
                      Ask about your business
                    </label>
                    <Textarea
                      value={aiQuestion}
                      onChange={(event) => {
                        setAiQuestion(event.target.value);
                        setAiNotice("");
                      }}
                      placeholder="Ask a question about your business finances..."
                      className="min-h-[90px] border-[#304538] bg-[#111A15] text-sm text-[#E5EDE6] placeholder:text-[#65766B]"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[10px] text-[#718178]">
                        Financial analysis connection pending
                      </span>
                      <Button
                        size="sm"
                        disabled={!aiQuestion.trim()}
                        onClick={askAi}
                        className="bg-[#B8F2D0] font-bold text-[#0B0E0C] hover:bg-[#9DE5B8]"
                      >
                        <Sparkles size={14} className="mr-2" />
                        Prepare question
                      </Button>
                    </div>
                    {aiNotice && (
                      <div className="rounded-xl border border-[#69512E] bg-[#241D12] p-3 text-xs leading-relaxed text-[#E8C18B]">
                        {aiNotice}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  icon: Search,
                  title: "Understand",
                  text: "Find patterns in your financial activity.",
                },
                {
                  icon: Lightbulb,
                  title: "Discover",
                  text: "Identify potential risks and opportunities.",
                },
                {
                  icon: Target,
                  title: "Take action",
                  text: "Turn evidence into practical business decisions.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-xl border border-[#263B30] bg-[#111A15] p-4"
                  >
                    <Icon size={20} className="mb-3 text-[#83C99B]" />
                    <p className="text-sm font-bold text-[#F2F0E4]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-[#819187]">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#26352C] pt-5">
          <div className="flex items-center gap-2 text-[10px] text-[#718178]">
            <ShieldCheck size={14} className="text-[#83C99B]" />
            GRIDSCOUT CFO · Financial workspace
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#718178]">
            <span>
              {demoMode
                ? "Illustrative sample environment"
                : scoreLoading
                  ? "Checking service..."
                  : scoreError
                    ? "Profile service unavailable"
                    : "Financial ledger not connected"}
            </span>
            <span className="text-[#304538]">•</span>
            <span>Kenya · KES</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
