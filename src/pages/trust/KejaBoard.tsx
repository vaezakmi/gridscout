
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Copy,
  Download,
  FileText,
  Home,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

type UnitStatus = "paid" | "due" | "overdue" | "vacant";
type FilterStatus = "all" | UnitStatus;

type Unit = {
  id: string;
  unit: string;
  tenant: string;
  phone: string;
  rent: number;
  dueDay: number;
  status: UnitStatus;
  balance: number;
  lastPaid?: string;
  notes?: string;
};

const INITIAL_UNITS: Unit[] = [
  {
    id: "1",
    unit: "A1",
    tenant: "Brian Otieno",
    phone: "254712345678",
    rent: 12000,
    dueDay: 3,
    status: "paid",
    balance: 0,
    lastPaid: "2026-11-05",
    notes: "Bedsitter",
  },
  {
    id: "2",
    unit: "A2",
    tenant: "Faith Njeri",
    phone: "254798001122",
    rent: 18500,
    dueDay: 5,
    status: "overdue",
    balance: 18500,
    lastPaid: "2026-10-05",
    notes: "One bedroom",
  },
  {
    id: "3",
    unit: "A3",
    tenant: "Kevin Maina",
    phone: "254701234567",
    rent: 18500,
    dueDay: 5,
    status: "due",
    balance: 3500,
    lastPaid: "2026-11-02",
    notes: "One bedroom",
  },
  {
    id: "4",
    unit: "B1",
    tenant: "Aisha Keja Stores",
    phone: "254722334455",
    rent: 25000,
    dueDay: 1,
    status: "vacant",
    balance: 0,
    notes: "Commercial shop",
  },
  {
    id: "5",
    unit: "A4",
    tenant: "Dennis Mwangi",
    phone: "254796554433",
    rent: 12000,
    dueDay: 3,
    status: "paid",
    balance: 0,
    lastPaid: "2026-11-06",
    notes: "Bedsitter",
  },
];

const fmtKes = (value: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);

const fmt = (value: number) =>
  new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 0,
  }).format(value);

const cls = (...classes: (string | false | undefined | null)[]) =>
  classes.filter(Boolean).join(" ");

const formatDate = (date?: string) => {
  if (!date) return "No payment recorded";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

const STATUS_META: Record<
  UnitStatus,
  { label: string; className: string; dot: string }
> = {
  paid: {
    label: "Paid",
    className: "border-[#83C99B]/30 bg-[#83C99B]/10 text-[#B8F2D0]",
    dot: "bg-[#83C99B]",
  },
  due: {
    label: "Due",
    className: "border-[#E8A33D]/30 bg-[#E8A33D]/10 text-[#E8A33D]",
    dot: "bg-[#E8A33D]",
  },
  overdue: {
    label: "Overdue",
    className: "border-[#D97869]/30 bg-[#D97869]/10 text-[#E89A8D]",
    dot: "bg-[#D97869]",
  },
  vacant: {
    label: "Vacant",
    className: "border-white/10 bg-white/5 text-[#A6B1A8]",
    dot: "bg-[#718077]",
  },
};

function StatusBadge({ status }: { status: UnitStatus }) {
  const meta = STATUS_META[status];

  return (
    <Badge
      className={cls(
        "gap-1.5 border px-2.5 py-1 text-[10px] font-semibold",
        meta.className
      )}
    >
      <span className={cls("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </Badge>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  accent,
  trend,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ElementType;
  accent: string;
  trend?: string;
}) {
  return (
    <Card className="border-[#26352C] bg-[#111813] text-[#F2F0E4] shadow-none">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#8A8D80]">
              {label}
            </p>
            <p className="mt-2 break-words text-xl font-black tracking-tight md:text-2xl">
              {value}
            </p>
          </div>

          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border"
            style={{
              color: accent,
              borderColor: `${accent}30`,
              backgroundColor: `${accent}12`,
            }}
          >
            <Icon size={19} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-[#8A8D80]">{description}</p>
          {trend && (
            <span className="text-[10px] font-semibold text-[#B8F2D0]">
              {trend}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressBar({
  value,
  color = "#83C99B",
}: {
  value: number;
  color?: string;
}) {
  const safe = Math.max(0, Math.min(100, value));

  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#26352C]">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${safe}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function KejaBoard() {
  const [units, setUnits] = useState<Unit[]>(INITIAL_UNITS);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"info" | "success" | "warning">("info");
  const [newUnit, setNewUnit] = useState({
    unit: "",
    tenant: "",
    phone: "",
    rent: "",
    dueDay: "5",
    notes: "",
  });

  const stats = useMemo(() => {
    const occupiedUnits = units.filter((unit) => unit.status !== "vacant");
    const vacantUnits = units.filter((unit) => unit.status === "vacant");
    const paidUnits = units.filter((unit) => unit.status === "paid");
    const overdueUnits = units.filter((unit) => unit.status === "overdue");
    const dueUnits = units.filter((unit) => unit.status === "due");

    const expectedRent = occupiedUnits.reduce(
      (sum, unit) => sum + unit.rent,
      0
    );

    const collected = occupiedUnits.reduce(
      (sum, unit) => sum + Math.max(0, unit.rent - unit.balance),
      0
    );

    const arrears = units.reduce((sum, unit) => sum + unit.balance, 0);

    const commission = Math.round(collected * 0.015);

    const occupancy = units.length
      ? Math.round((occupiedUnits.length / units.length) * 100)
      : 0;

    const collectionRate = expectedRent
      ? Math.round((collected / expectedRent) * 100)
      : 0;

    return {
      total: units.length,
      occupied: occupiedUnits.length,
      vacant: vacantUnits.length,
      paid: paidUnits.length,
      due: dueUnits.length,
      overdue: overdueUnits.length,
      expectedRent,
      collected,
      arrears,
      commission,
      occupancy,
      collectionRate,
    };
  }, [units]);

  const filteredUnits = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return units.filter((unit) => {
      if (filter !== "all" && unit.status !== filter) return false;

      if (!normalized) return true;

      return [
        unit.unit,
        unit.tenant,
        unit.phone,
        unit.status,
        unit.notes ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [units, query, filter]);

  const currentMonth = new Intl.DateTimeFormat("en-KE", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  const showNotice = (
    message: string,
    type: "info" | "success" | "warning" = "info"
  ) => {
    setNotice(message);
    setNoticeType(type);
  };

  const markPaidDemo = (unit: Unit) => {
    setUnits((previous) =>
      previous.map((item) =>
        item.id === unit.id
          ? {
              ...item,
              status: "paid",
              balance: 0,
              lastPaid: new Date().toISOString().slice(0, 10),
            }
          : item
      )
    );

    setSelectedUnit(null);
    showNotice(
      `${unit.unit} updated in this demo session. No real payment was received.`,
      "success"
    );
  };

  const prepareStkPreview = (unit: Unit) => {
    showNotice(
      `STK preview prepared for ${unit.tenant}: ${fmtKes(unit.balance || unit.rent)}. Daraja is not connected yet.`,
      "warning"
    );
  };

  const prepareReminder = (unit: Unit) => {
    const amount = unit.balance || unit.rent;

    const message = `Hello ${unit.tenant}, this is a friendly rent reminder for ${unit.unit}. Your outstanding rent balance is ${fmtKes(amount)}. Kindly arrange payment. Thank you.`;

    setSelectedUnit(unit);

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(message)
        .then(() =>
          showNotice(
            `Reminder text copied for ${unit.tenant}. Send it through your preferred messaging app.`,
            "success"
          )
        )
        .catch(() =>
          showNotice("Reminder prepared. Clipboard access was unavailable.", "info")
        );
    } else {
      showNotice("Reminder prepared. Messaging integration is not connected yet.", "info");
    }
  };

  const addUnit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const rent = Number(newUnit.rent);
    const dueDay = Number(newUnit.dueDay);

    if (!newUnit.unit.trim()) {
      showNotice("Enter a unit reference first.", "warning");
      return;
    }

    if (!Number.isFinite(rent) || rent <= 0) {
      showNotice("Enter a valid monthly rent amount.", "warning");
      return;
    }

    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) {
      showNotice("Choose a rent due day between 1 and 28.", "warning");
      return;
    }

    if (newUnit.phone && !/^254\d{9}$/.test(newUnit.phone.trim())) {
      showNotice("Use the phone format 2547XXXXXXXX or 2541XXXXXXXX.", "warning");
      return;
    }

    const hasTenant = Boolean(newUnit.tenant.trim());

    const unit: Unit = {
      id: `local-${Date.now()}`,
      unit: newUnit.unit.trim(),
      tenant: hasTenant ? newUnit.tenant.trim() : "",
      phone: newUnit.phone.trim(),
      rent,
      dueDay,
      status: hasTenant ? "due" : "vacant",
      balance: hasTenant ? rent : 0,
      notes: newUnit.notes.trim(),
    };

    setUnits((previous) => [...previous, unit]);

    setNewUnit({
      unit: "",
      tenant: "",
      phone: "",
      rent: "",
      dueDay: "5",
      notes: "",
    });

    setShowAdd(false);
    showNotice(`${unit.unit} added to this demo portfolio.`, "success");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#0B0E0C] px-4 py-5 text-[#F2F0E4] md:px-7 md:py-8">
      <div className="mx-auto max-w-7xl space-y-7">

        {/* HEADER */}
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.22em] text-[#B8F2D0]">
              <Building2 size={15} />
              GRIDSCOUT / PROPERTY INTELLIGENCE
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                Keja Grid<span className="text-[#83C99B]">.</span>
              </h1>

              <Badge className="border border-[#83C99B]/30 bg-[#83C99B]/10 px-3 py-1 text-[9px] font-mono tracking-widest text-[#B8F2D0]">
                RENT OPERATIONS
              </Badge>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#8A8D80]">
              Your rental portfolio, collections and tenant operations in one
              command centre. Built for the way Kenyan landlords do business.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-[#718077]">
              <CalendarDays size={12} />
              {currentMonth}
              <span className="text-[#34483A]">/</span>
              <span>{stats.total} units in portfolio</span>
              <span className="text-[#34483A]">/</span>
              <span>KES reporting</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="border-[#26352C] bg-[#111813] text-[#A6B1A8] hover:bg-[#1A241D] hover:text-[#F2F0E4]"
            >
              <Download size={15} className="mr-2" />
              Print report
            </Button>

            <Button
              onClick={() => setShowAdd((value) => !value)}
              className="bg-[#B8F2D0] font-bold text-[#0B0E0C] hover:bg-[#83C99B]"
            >
              {showAdd ? (
                <X size={16} className="mr-2" />
              ) : (
                <Plus size={16} className="mr-2" />
              )}
              {showAdd ? "Close form" : "Add unit"}
            </Button>
          </div>
        </header>

        {/* DEMO NOTICE */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E8A33D]/25 bg-[#E8A33D]/[0.07] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#E8A33D]/10 text-[#E8A33D]">
              <Activity size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-[#F2F0E4]">
                Interactive demonstration
              </div>
              <div className="text-[10px] text-[#A6B1A8]">
                Sample property records. Changes are local to this session. No live collections or automated messages.
              </div>
            </div>
          </div>
          <Badge className="border border-[#E8A33D]/30 bg-transparent text-[#E8A33D]">
            DEMO DATA
          </Badge>
        </div>

        {/* NOTIFICATION */}
        {notice && (
          <div
            className={cls(
              "flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-xs",
              noticeType === "success" &&
                "border-[#83C99B]/30 bg-[#83C99B]/10 text-[#B8F2D0]",
              noticeType === "warning" &&
                "border-[#E8A33D]/30 bg-[#E8A33D]/10 text-[#E8C18C]",
              noticeType === "info" &&
                "border-[#26352C] bg-[#111813] text-[#A6B1A8]"
            )}
          >
            <div className="flex items-center gap-2">
              {noticeType === "success" ? (
                <CheckCircle2 size={15} />
              ) : (
                <Activity size={15} />
              )}
              {notice}
            </div>
            <button onClick={() => setNotice("")} aria-label="Dismiss notification">
              <X size={14} />
            </button>
          </div>
        )}

        {/* KPI GRID */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Monthly rent potential"
            value={fmtKes(stats.expectedRent)}
            description={`${stats.occupied} occupied units`}
            icon={Wallet}
            accent="#B8F2D0"
          />

          <MetricCard
            label="Collected so far"
            value={fmtKes(stats.collected)}
            description={`${stats.collectionRate}% of expected rent`}
            icon={ArrowDownRight}
            accent="#83C99B"
          />

          <MetricCard
            label="Outstanding arrears"
            value={fmtKes(stats.arrears)}
            description={`${stats.due + stats.overdue} units with balances`}
            icon={ArrowUpRight}
            accent="#D97869"
          />

          <MetricCard
            label="Occupancy rate"
            value={`${stats.occupancy}%`}
            description={`${stats.occupied} occupied / ${stats.vacant} vacant`}
            icon={Home}
            accent="#E8AD68"
          />

          <MetricCard
            label="Illustrative platform fee"
            value={fmtKes(stats.commission)}
            description="1.5% of recorded collections"
            icon={CircleDollarSign}
            accent="#E8C18C"
          />
        </section>

        {/* PORTFOLIO HEALTH */}
        <section className="grid gap-4 lg:grid-cols-5">
          <Card className="overflow-hidden border-[#34483A] bg-gradient-to-br from-[#18251B] via-[#111813] to-[#0B0E0C] text-[#F2F0E4] shadow-none lg:col-span-3">
            <CardContent className="p-5 md:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#83C99B]">
                    PORTFOLIO PERFORMANCE
                  </div>
                  <h2 className="mt-2 text-xl font-black">
                    Your rental portfolio at a glance.
                  </h2>
                  <p className="mt-1 text-xs text-[#8A8D80]">
                    Collection and occupancy indicators from the displayed records.
                  </p>
                </div>

                <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#83C99B]/20 bg-[#83C99B]/10 text-[#B8F2D0]">
                  <TrendingUp size={20} />
                </div>
              </div>

              <div className="mt-7 grid gap-7 sm:grid-cols-2">
                <div>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-[#8A8D80]">
                        Collection rate
                      </div>
                      <div className="mt-2 text-4xl font-black">
                        {stats.collectionRate}%
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-[#8A8D80]">
                      {fmtKes(stats.collected)}
                      <div>of {fmtKes(stats.expectedRent)}</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <ProgressBar value={stats.collectionRate} />
                  </div>

                  <div className="mt-2 text-[10px] text-[#8A8D80]">
                    Collected rent compared with occupied-unit rent potential.
                  </div>
                </div>

                <div>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-[#8A8D80]">
                        Occupancy
                      </div>
                      <div className="mt-2 text-4xl font-black">
                        {stats.occupancy}%
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-[#8A8D80]">
                      {stats.occupied} occupied
                      <div>{stats.vacant} vacant</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <ProgressBar value={stats.occupancy} color="#E8A33D" />
                  </div>

                  <div className="mt-2 text-[10px] text-[#8A8D80]">
                    Occupied units compared with all units in the portfolio.
                  </div>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-3 gap-2 border-t border-white/10 pt-5">
                <div>
                  <div className="text-2xl font-black text-[#B8F2D0]">
                    {stats.paid}
                  </div>
                  <div className="mt-1 text-[10px] text-[#8A8D80]">Paid</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-[#E8AD68]">
                    {stats.due}
                  </div>
                  <div className="mt-1 text-[10px] text-[#8A8D80]">Due</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-[#E89A8D]">
                    {stats.overdue}
                  </div>
                  <div className="mt-1 text-[10px] text-[#8A8D80]">Overdue</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* COLLECTION BREAKDOWN */}
          <Card className="border-[#26352C] bg-[#111813] text-[#F2F0E4] shadow-none lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-xs font-mono uppercase tracking-widest">
                COLLECTION BREAKDOWN
              </CardTitle>
              <CardDescription className="text-[#8A8D80]">
                Outstanding balance by unit status.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {[
                {
                  label: "Paid",
                  count: stats.paid,
                  total: stats.total,
                  color: "#83C99B",
                },
                {
                  label: "Due",
                  count: stats.due,
                  total: stats.total,
                  color: "#E8A33D",
                },
                {
                  label: "Overdue",
                  count: stats.overdue,
                  total: stats.total,
                  color: "#D97869",
                },
                {
                  label: "Vacant",
                  count: stats.vacant,
                  total: stats.total,
                  color: "#718077",
                },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="text-[#A6B1A8]">{item.label}</span>
                    <span className="font-mono font-bold">
                      {item.count} / {item.total}
                    </span>
                  </div>
                  <ProgressBar
                    value={item.total ? (item.count / item.total) * 100 : 0}
                    color={item.color}
                  />
                </div>
              ))}

              <div className="rounded-xl border border-[#26352C] bg-[#0B0E0C] p-4">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#8A8D80]">
                  Current arrears exposure
                </div>
                <div className="mt-2 text-2xl font-black text-[#E89A8D]">
                  {fmtKes(stats.arrears)}
                </div>
                <div className="mt-1 text-[10px] text-[#8A8D80]">
                  Sum of outstanding balances in this demo portfolio.
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* UNITS + ADD FORM */}
        <section className="grid items-start gap-4 lg:grid-cols-5">
          <Card className="border-[#26352C] bg-[#111813] text-[#F2F0E4] shadow-none lg:col-span-3">
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-mono uppercase tracking-widest">
                    PROPERTY REGISTER
                  </CardTitle>
                  <CardDescription className="mt-1 text-[#8A8D80]">
                    {filteredUnits.length} results from {units.length} units.
                  </CardDescription>
                </div>

                <Badge className="border border-[#26352C] bg-[#0B0E0C] text-[#A6B1A8]">
                  {stats.total} TOTAL UNITS
                </Badge>
              </div>

              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#718077]"
                />
                <Input
                  placeholder="Search unit, tenant, phone or notes..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="border-[#26352C] bg-[#0B0E0C] pl-9 text-[#F2F0E4] placeholder:text-[#718077] focus-visible:ring-[#83C99B]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  ["all", "paid", "due", "overdue", "vacant"] as FilterStatus[]
                ).map((status) => {
                  const active = filter === status;

                  return (
                    <button
                      key={status}
                      onClick={() => setFilter(status)}
                      className={cls(
                        "rounded-full border px-3 py-1.5 text-[10px] font-semibold capitalize transition",
                        active
                          ? "border-[#83C99B] bg-[#83C99B] text-[#0B0E0C]"
                          : "border-[#26352C] bg-[#0B0E0C] text-[#A6B1A8] hover:border-[#83C99B]/40"
                      )}
                    >
                      {status === "all" ? "All units" : status}
                    </button>
                  );
                })}
              </div>
            </CardHeader>

            <CardContent className="space-y-2">
              {filteredUnits.map((unit) => (
                <div
                  key={unit.id}
                  className="rounded-xl border border-[#26352C] bg-[#0B0E0C] p-4 transition hover:border-[#83C99B]/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold">{unit.unit}</h3>
                        <StatusBadge status={unit.status} />
                      </div>

                      <div className="mt-2 text-xs text-[#A6B1A8]">
                        {unit.tenant || "Unassigned unit"}
                      </div>

                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#718077]">
                        {unit.phone && <span>{unit.phone}</span>}
                        <span>Due day {unit.dueDay}</span>
                        <span>{fmtKes(unit.rent)} / month</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[9px] font-mono uppercase tracking-widest text-[#718077]">
                        Balance
                      </div>
                      <div
                        className={cls(
                          "mt-1 text-sm font-black",
                          unit.balance > 0 ? "text-[#E89A8D]" : "text-[#B8F2D0]"
                        )}
                      >
                        {fmtKes(unit.balance)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#26352C] pt-3">
                    <span className="text-[10px] text-[#718077]">
                      {unit.lastPaid
                        ? `Last payment: ${formatDate(unit.lastPaid)}`
                        : unit.status === "vacant"
                          ? "Awaiting tenant assignment"
                          : "No payment recorded"}
                    </span>

                    <div className="flex flex-wrap gap-1.5">
                      {unit.status !== "vacant" && (
                        <>
                          {unit.status !== "paid" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => prepareReminder(unit)}
                                className="h-8 border-[#26352C] bg-[#111813] px-2.5 text-[10px] text-[#A6B1A8] hover:bg-[#1A241D] hover:text-white"
                              >
                                <MessageCircle size={12} className="mr-1" />
                                Reminder
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => prepareStkPreview(unit)}
                                className="h-8 bg-[#B8F2D0] px-2.5 text-[10px] font-bold text-[#0B0E0C] hover:bg-[#83C99B]"
                              >
                                <Zap size={12} className="mr-1" />
                                STK preview
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedUnit(unit)}
                                className="h-8 border-[#26352C] bg-[#111813] px-2.5 text-[10px] text-[#A6B1A8] hover:text-white"
                              >
                                Mark paid (demo)
                              </Button>
                            </>
                          )}
                        </>
                      )}

                      {unit.status === "vacant" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setNewUnit({
                              unit: unit.unit,
                              tenant: "",
                              phone: "",
                              rent: String(unit.rent),
                              dueDay: String(unit.dueDay),
                              notes: unit.notes ?? "",
                            });
                            setShowAdd(true);
                          }}
                          className="h-8 border-[#26352C] bg-[#111813] text-[10px] text-[#A6B1A8] hover:text-white"
                        >
                          Assign tenant
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredUnits.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#34483A] p-10 text-center">
                  <Search className="mx-auto text-[#718077]" size={24} />
                  <div className="mt-3 text-sm font-bold">No matching units</div>
                  <p className="mt-1 text-xs text-[#8A8D80]">
                    Try another search or change your status filter.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 text-[#B8F2D0]"
                    onClick={() => {
                      setQuery("");
                      setFilter("all");
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ADD UNIT FORM */}
          <Card className="border-[#26352C] bg-[#111813] text-[#F2F0E4] shadow-none lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-mono uppercase tracking-widest">
                    {showAdd ? "UNIT REGISTRATION" : "PORTFOLIO SETUP"}
                  </CardTitle>
                  <CardDescription className="mt-1 text-[#8A8D80]">
                    {showAdd
                      ? "Register a property unit and tenant."
                      : "Grow your rental portfolio."}
                  </CardDescription>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#83C99B]/10 text-[#B8F2D0]">
                  {showAdd ? <Plus size={19} /> : <Building2 size={19} />}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {!showAdd ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#26352C] bg-[#0B0E0C] p-4">
                    <div className="text-xs font-bold">Property onboarding</div>
                    <p className="mt-2 text-xs leading-relaxed text-[#8A8D80]">
                      Start with the unit register. Record rent, assign a tenant,
                      and track outstanding balances.
                    </p>
                    <div className="mt-4 space-y-3">
                      {[
                        "Register rental units",
                        "Record tenant details",
                        "Track rent and arrears",
                        "Prepare collection requests",
                      ].map((item, index) => (
                        <div
                          key={item}
                          className="flex items-center gap-3 text-xs text-[#A6B1A8]"
                        >
                          <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#83C99B]/10 text-[10px] font-bold text-[#B8F2D0]">
                            {index + 1}
                          </span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => setShowAdd(true)}
                    className="w-full bg-[#B8F2D0] font-bold text-[#0B0E0C] hover:bg-[#83C99B]"
                  >
                    <Plus size={15} className="mr-2" />
                    Add property unit
                  </Button>

                  <p className="text-center text-[10px] text-[#718077]">
                    Your changes are currently stored in local component state only.
                  </p>
                </div>
              ) : (
                <form onSubmit={addUnit} className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-widest text-[#8A8D80]">
                      Unit reference *
                    </label>
                    <Input
                      required
                      placeholder="e.g. Block A - A5"
                      value={newUnit.unit}
                      onChange={(event) =>
                        setNewUnit((previous) => ({
                          ...previous,
                          unit: event.target.value,
                        }))
                      }
                      className="border-[#26352C] bg-[#0B0E0C] text-[#F2F0E4] placeholder:text-[#718077]"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-widest text-[#8A8D80]">
                      Tenant name
                    </label>
                    <Input
                      placeholder="Tenant or business name"
                      value={newUnit.tenant}
                      onChange={(event) =>
                        setNewUnit((previous) => ({
                          ...previous,
                          tenant: event.target.value,
                        }))
                      }
                      className="border-[#26352C] bg-[#0B0E0C] text-[#F2F0E4] placeholder:text-[#718077]"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-widest text-[#8A8D80]">
                      M-Pesa phone
                    </label>
                    <Input
                      placeholder="2547XXXXXXXX"
                      value={newUnit.phone}
                      onChange={(event) =>
                        setNewUnit((previous) => ({
                          ...previous,
                          phone: event.target.value,
                        }))
                      }
                      className="border-[#26352C] bg-[#0B0E0C] font-mono text-[#F2F0E4] placeholder:text-[#718077]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-widest text-[#8A8D80]">
                        Monthly rent *
                      </label>
                      <Input
                        required
                        type="number"
                        min="1"
                        placeholder="15000"
                        value={newUnit.rent}
                        onChange={(event) =>
                          setNewUnit((previous) => ({
                            ...previous,
                            rent: event.target.value,
                          }))
                        }
                        className="border-[#26352C] bg-[#0B0E0C] text-[#F2F0E4] placeholder:text-[#718077]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-widest text-[#8A8D80]">
                        Due day
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="28"
                        value={newUnit.dueDay}
                        onChange={(event) =>
                          setNewUnit((previous) => ({
                            ...previous,
                            dueDay: event.target.value,
                          }))
                        }
                        className="border-[#26352C] bg-[#0B0E0C] text-[#F2F0E4]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-widest text-[#8A8D80]">
                      Property notes
                    </label>
                    <Textarea
                      placeholder="e.g. One bedroom, deposit details..."
                      value={newUnit.notes}
                      onChange={(event) =>
                        setNewUnit((previous) => ({
                          ...previous,
                          notes: event.target.value,
                        }))
                      }
                      className="min-h-[85px] resize-y border-[#26352C] bg-[#0B0E0C] text-[#F2F0E4] placeholder:text-[#718077]"
                    />
                  </div>

                  <div className="rounded-lg border border-[#26352C] bg-[#0B0E0C] p-3 text-[10px] leading-relaxed text-[#8A8D80]">
                    A tenant name creates an occupied unit with an outstanding
                    balance. Leaving the tenant name blank creates a vacant unit.
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      type="submit"
                      className="flex-1 bg-[#B8F2D0] font-bold text-[#0B0E0C] hover:bg-[#83C99B]"
                    >
                      <Check size={15} className="mr-2" />
                      Save unit
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAdd(false)}
                      className="border-[#26352C] bg-transparent text-[#A6B1A8] hover:bg-[#1A241D]"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </section>

        {/* RENT COLLECTION WORKFLOW */}
        <section className="space-y-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#83C99B]">
              COLLECTION OPERATIONS
            </div>
            <h2 className="mt-1 text-xl font-black">
              From rent due to rent received.
            </h2>
            <p className="mt-1 text-xs text-[#8A8D80]">
              The intended Keja Grid collection workflow.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: CalendarDays,
                step: "01",
                title: "Before due date",
                description: "Prepare friendly rent reminders for tenants.",
                timing: "Day 28",
                color: "#83C99B",
              },
              {
                icon: Clock3,
                step: "02",
                title: "Rent becomes due",
                description: "Review outstanding balances and due units.",
                timing: "Due date",
                color: "#E8A33D",
              },
              {
                icon: Zap,
                step: "03",
                title: "Payment request",
                description: "Prepare an M-Pesa STK collection request.",
                timing: "After due date",
                color: "#B8F2D0",
              },
              {
                icon: FileText,
                step: "04",
                title: "Landlord reporting",
                description: "Review collection records and prepare statements.",
                timing: "Monthly",
                color: "#E8AD68",
              },
            ].map((step) => (
              <Card
                key={step.step}
                className="border-[#26352C] bg-[#111813] text-[#F2F0E4] shadow-none"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div
                      className="grid h-10 w-10 place-items-center rounded-xl border"
                      style={{
                        color: step.color,
                        borderColor: `${step.color}30`,
                        backgroundColor: `${step.color}10`,
                      }}
                    >
                      <step.icon size={19} />
                    </div>
                    <span className="font-mono text-xs text-[#718077]">
                      {step.step}
                    </span>
                  </div>

                  <div className="mt-4 text-sm font-bold">{step.title}</div>
                  <p className="mt-2 min-h-[40px] text-xs leading-relaxed text-[#8A8D80]">
                    {step.description}
                  </p>
                  <div className="mt-4 border-t border-[#26352C] pt-3 text-[10px] font-mono text-[#A6B1A8]">
                    {step.timing}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="rounded-xl border border-[#26352C] bg-[#111813] p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#E8A33D]/10 text-[#E8A33D]">
                <ShieldCheck size={18} />
              </div>
              <div>
                <div className="text-sm font-bold">
                  Payment verification comes first.
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#8A8D80]">
                  A payment request is not a payment. In the production workflow,
                  unit balances must only update after a verified payment confirmation
                  is received and reconciled.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* REVENUE MODEL */}
        <section className="overflow-hidden rounded-2xl border border-[#66502C] bg-gradient-to-br from-[#201B11] via-[#151710] to-[#0D110D] p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge className="border border-[#E8A33D]/30 bg-[#E8A33D]/10 text-[#E8A33D]">
                KEJA GRID BUSINESS MODEL
              </Badge>
              <h2 className="mt-4 text-2xl font-black">
                A simpler way to manage collections.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#A6B1A8]">
                The proposed platform fee is based on successful collections,
                not simply the number of units in a landlord's portfolio.
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black text-[#E8AD68]">1.5%</div>
              <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-[#8A8D80]">
                Proposed collection fee
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#8A8D80]">
                Recorded collections
              </div>
              <div className="mt-2 text-xl font-black">
                {fmtKes(stats.collected)}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#8A8D80]">
                Illustrative fee
              </div>
              <div className="mt-2 text-xl font-black text-[#E8AD68]">
                {fmtKes(stats.commission)}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#8A8D80]">
                Collection principle
              </div>
              <div className="mt-2 text-sm font-bold text-[#B8F2D0]">
                No collection, no fee.
              </div>
            </div>
          </div>

          <p className="mt-4 text-[10px] leading-relaxed text-[#8A8D80]">
            Illustrative calculation only. The commercial fee, payment processing
            costs, collection definitions and applicable terms must be finalized
            before launch.
          </p>
        </section>

        {/* FOOTER */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#26352C] pt-5 text-[10px] text-[#718077]">
          <div className="flex items-center gap-2 font-mono tracking-widest">
            <Building2 size={13} className="text-[#83C99B]" />
            GRIDSCOUT / KEJA GRID
          </div>
          <div>
            Rental operations intelligence • Built for Kenyan property owners
          </div>
        </footer>
      </div>

      {/* DEMO PAYMENT CONFIRMATION */}
      {selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#34483A] bg-[#111813] p-6 text-[#F2F0E4] shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#E8A33D]">
                  DEMONSTRATION ACTION
                </div>
                <h2 className="mt-2 text-xl font-black">
                  Mark this unit as paid?
                </h2>
              </div>
              <button
                onClick={() => setSelectedUnit(null)}
                className="text-[#8A8D80] hover:text-white"
                aria-label="Close confirmation"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-[#26352C] bg-[#0B0E0C] p-4">
              <div className="text-sm font-bold">{selectedUnit.unit}</div>
              <div className="mt-1 text-xs text-[#8A8D80]">
                {selectedUnit.tenant}
              </div>
              <div className="mt-4 text-[10px] font-mono uppercase tracking-widest text-[#8A8D80]">
                Outstanding balance
              </div>
              <div className="mt-1 text-2xl font-black text-[#E89A8D]">
                {fmtKes(selectedUnit.balance)}
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-[#8A8D80]">
              This action only changes the local demonstration data. It does
              not verify or record an actual M-Pesa payment.
            </p>

            <div className="mt-5 flex gap-2">
              <Button
                onClick={() => markPaidDemo(selectedUnit)}
                className="flex-1 bg-[#B8F2D0] font-bold text-[#0B0E0C] hover:bg-[#83C99B]"
              >
                <CheckCircle2 size={15} className="mr-2" />
                Confirm demo update
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedUnit(null)}
                className="border-[#26352C] bg-transparent text-[#A6B1A8] hover:bg-[#1A241D]"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
