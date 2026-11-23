
import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";

type Status =
  | "new"
  | "quoted"
  | "in_progress"
  | "delivered"
  | "declined"
  | "cancelled";

const STATUSES: Status[] = [
  "new",
  "quoted",
  "in_progress",
  "delivered",
  "declined",
  "cancelled",
];

const STATUS_LABELS: Record<Status, string> = {
  new: "New",
  quoted: "Quoted",
  in_progress: "In Progress",
  delivered: "Delivered",
  declined: "Declined",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<Status, string> = {
  new: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  quoted: "border-violet-400/25 bg-violet-400/10 text-violet-300",
  in_progress: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  delivered: "border-green-400/25 bg-green-400/10 text-green-300",
  declined: "border-red-400/25 bg-red-400/10 text-red-300",
  cancelled: "border-slate-400/25 bg-slate-400/10 text-slate-400",
};

const CLOSED_STATUSES: Status[] = [
  "delivered",
  "declined",
  "cancelled",
];

const money = (amount: number) =>
  `KES ${Number(amount || 0).toLocaleString("en-KE")}`;

const formatDate = (value: Date | string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const packageLabel = (value: string) =>
  value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function Metric({
  label,
  value,
  detail,
  accent = "text-white",
}: {
  label: string;
  value: string | number;
  detail: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#111b17] p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className={`mt-3 text-3xl font-semibold tracking-tight ${accent}`}>
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.025] text-slate-500">
        <span className="text-xl">⌁</span>
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-300">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default function AdminFixes() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | Status>("All");
  const [activeTab, setActiveTab] = useState<"Queue" | "Workflow">("Queue");
  const [quoteDraft, setQuoteDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState(false);

  const utils = trpc.useUtils();

  // Refresh automatically so customer submissions reach the admin queue.
  const requestsQuery = trpc.fixes.adminList.useQuery(
    statusFilter === "All" ? {} : { statuses: [statusFilter] },
    {
      refetchOnWindowFocus: true,
      refetchOnMount: "always",
      refetchInterval: 15_000,
      refetchIntervalInBackground: false,
      retry: 1,
    },
  );

  const updateRequest = trpc.fixes.adminUpdate.useMutation({
    onSuccess: async () => {
      setActionError(false);
      setActionMessage("Request updated successfully.");
      setQuoteDraft("");
      setNoteDraft("");

      await Promise.all([
        utils.fixes.adminList.invalidate(),
        utils.fixes.mine.invalidate(),
      ]);
    },
    onError: (error) => {
      setActionError(true);
      setActionMessage(error.message);
    },
  });

  const requests = requestsQuery.data ?? [];

  const selected =
    requests.find((request) => request.id === selectedId) ?? null;

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesSearch =
        !query ||
        request.business.name.toLowerCase().includes(query) ||
        String(request.id).includes(query) ||
        String(request.leadId).includes(query) ||
        request.packages.some((item) =>
          packageLabel(item).toLowerCase().includes(query),
        ) ||
        (request.note ?? "").toLowerCase().includes(query);

      // Explicit status filters must always be allowed to show their results.
      // The checkbox only controls closed requests under the All filter.
      const isClosed = CLOSED_STATUSES.includes(request.status);

      const matchesClosed =
        statusFilter !== "All" || showClosed || !isClosed;

      return matchesSearch && matchesClosed;
    });
  }, [requests, search, showClosed, statusFilter]);

  const count = (status: Status) =>
    requests.filter((request) => request.status === status).length;

  const activeRequests = requests.filter((request) =>
    ["new", "quoted", "in_progress"].includes(request.status),
  );

  const activeValue = activeRequests.reduce(
    (sum, request) => sum + request.totalKes,
    0,
  );

  const quotedValue = requests
    .filter((request) => request.quotedKes !== null)
    .reduce((sum, request) => sum + (request.quotedKes ?? 0), 0);

  const selectRequest = (id: number) => {
    setSelectedId(id);
    setQuoteDraft("");
    setNoteDraft("");
    setActionMessage("");
    setActionError(false);
  };

  const submitUpdate = (input: {
    id: number;
    status?: Status;
    quotedKes?: number;
    adminNote?: string;
  }) => {
    setActionMessage("");
    setActionError(false);
    updateRequest.mutate(input);
  };

  const sendQuote = () => {
    if (!selected) return;

    const amount = Number(quoteDraft);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setActionError(true);
      setActionMessage("Enter a valid quotation in whole KES.");
      return;
    }

    if (amount > 10_000_000) {
      setActionError(true);
      setActionMessage("Quotation exceeds the allowed maximum.");
      return;
    }

    submitUpdate({
      id: selected.id,
      status: "quoted",
      quotedKes: amount,
      ...(noteDraft.trim() ? { adminNote: noteDraft.trim() } : {}),
    });
  };

  const saveInternalNote = () => {
    if (!selected || !noteDraft.trim()) return;

    submitUpdate({
      id: selected.id,
      adminNote: noteDraft.trim(),
    });
  };

  const declineRequest = () => {
    if (!selected) return;

    if (!window.confirm(`Decline Service Desk request #${selected.id}?`)) {
      return;
    }

    submitUpdate({
      id: selected.id,
      status: "declined",
      ...(noteDraft.trim() ? { adminNote: noteDraft.trim() } : {}),
    });
  };

  const cancelRequest = () => {
    if (!selected) return;

    if (!window.confirm(`Cancel Service Desk request #${selected.id}?`)) {
      return;
    }

    submitUpdate({
      id: selected.id,
      status: "cancelled",
      ...(noteDraft.trim() ? { adminNote: noteDraft.trim() } : {}),
    });
  };

  const canQuote = selected?.status === "new";

  const canDecline =
    selected?.status === "new" || selected?.status === "quoted";

  const canCancel =
    selected?.status === "new" ||
    selected?.status === "quoted" ||
    selected?.status === "in_progress";

  const isTerminal =
    selected !== null && CLOSED_STATUSES.includes(selected.status);

  return (
    <main className="min-h-screen bg-[#080e0b] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-7">
        {/* Header */}
        <header className="flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-6 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">
                GRIDSCOUT / OPERATIONS
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Service <span className="text-emerald-400">Desk.</span>
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Review customer requests, prepare quotations and coordinate
              service delivery from one operations workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              Live request data
            </span>

            <button
              onClick={() => requestsQuery.refetch()}
              disabled={requestsQuery.isFetching}
              className="rounded-full border border-white/10 px-3 py-2 text-[10px] font-semibold text-slate-300 transition hover:border-emerald-400/40 hover:text-emerald-300 disabled:opacity-40"
            >
              {requestsQuery.isFetching ? "Refreshing..." : "↻ Refresh queue"}
            </button>
          </div>
        </header>

        {/* Background refresh indicator */}
        {requestsQuery.isFetching && !requestsQuery.isLoading && (
          <div className="flex items-center gap-2 text-[10px] text-emerald-300/70">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Checking for new customer requests...
          </div>
        )}

        {/* Metrics */}
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <Metric
            label="Open requests"
            value={activeRequests.length}
            detail="New, quoted and active work"
            accent="text-emerald-300"
          />
          <Metric
            label="New requests"
            value={count("new")}
            detail="Awaiting initial review"
            accent="text-sky-300"
          />
          <Metric
            label="Awaiting response"
            value={count("quoted")}
            detail="Quotation issued"
            accent="text-violet-300"
          />
          <Metric
            label="In progress"
            value={count("in_progress")}
            detail="Marked as active work"
            accent="text-amber-300"
          />
          <Metric
            label="Quoted value"
            value={money(quotedValue)}
            detail="Total of issued quotations"
            accent="text-green-300"
          />
        </section>

        {/* Pipeline summary */}
        <section className="rounded-2xl border border-emerald-400/15 bg-gradient-to-r from-emerald-400/[0.09] to-transparent p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                Request pipeline
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {money(activeValue)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Submitted package list value, not confirmed revenue
              </p>
            </div>

            <div className="flex flex-wrap gap-5">
              {STATUSES.map((status) => (
                <div key={status}>
                  <p className="text-xl font-semibold">{count(status)}</p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {STATUS_LABELS[status]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Main workspace */}
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.8fr)]">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#101914]">
            {/* Queue header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] p-5">
              <div>
                <p className="text-lg font-semibold">Fix operations</p>
                <p className="mt-1 text-xs text-slate-500">
                  Customer requests from the GRIDSCOUT database
                </p>
              </div>

              <div className="flex rounded-lg border border-white/10 bg-black/20 p-1">
                {(["Queue", "Workflow"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
                      activeTab === tab
                        ? "bg-emerald-400 text-[#07110c]"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === "Queue" ? (
              <>
                {/* Filters */}
                <div className="grid gap-3 border-b border-white/[0.06] p-4 sm:grid-cols-[1fr_180px]">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search business, request ID, package..."
                    className="min-w-0 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/50"
                  />

                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as "All" | Status)
                    }
                    className="rounded-xl border border-white/10 bg-[#111b17] px-3 py-3 text-xs text-slate-300 outline-none focus:border-emerald-400/50"
                  >
                    <option value="All">All statuses</option>
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between px-5 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Request queue · {filteredRequests.length} records
                  </p>

                  <label className="flex cursor-pointer items-center gap-2 text-[10px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={showClosed}
                      onChange={(event) =>
                        setShowClosed(event.target.checked)
                      }
                      className="accent-emerald-400"
                    />
                    Show closed
                  </label>
                </div>

                {/* Loading */}
                {requestsQuery.isLoading && (
                  <div className="p-12 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-emerald-400/20 border-t-emerald-400" />
                    <p className="mt-4 text-xs text-slate-500">
                      Loading Service Desk requests...
                    </p>
                  </div>
                )}

                {/* Error */}
                {requestsQuery.isError && (
                  <div className="m-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-5">
                    <p className="text-sm font-semibold text-red-300">
                      Unable to load Service Desk
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      {requestsQuery.error.message}
                    </p>
                    <button
                      onClick={() => requestsQuery.refetch()}
                      disabled={requestsQuery.isFetching}
                      className="mt-4 rounded-lg border border-red-400/20 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-400/10 disabled:opacity-40"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {/* Request list */}
                {!requestsQuery.isLoading &&
                  !requestsQuery.isError &&
                  filteredRequests.length > 0 && (
                    <div className="divide-y divide-white/[0.05]">
                      {filteredRequests.map((request) => (
                        <button
                          key={request.id}
                          onClick={() => selectRequest(request.id)}
                          className={`w-full p-5 text-left transition hover:bg-white/[0.025] ${
                            selectedId === request.id
                              ? "border-l-2 border-l-emerald-400 bg-emerald-400/[0.045]"
                              : "border-l-2 border-l-transparent"
                          }`}
                        >
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-[10px] text-emerald-300">
                                  FIX-{String(request.id).padStart(5, "0")}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  Lead #{request.leadId}
                                </span>
                              </div>

                              <h3 className="mt-2 truncate text-sm font-semibold text-white">
                                {request.business.name}
                              </h3>

                              <p className="mt-1 text-xs text-slate-500">
                                {request.business.area || "Area unavailable"}
                              </p>

                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {request.packages.map((item) => (
                                  <span
                                    key={item}
                                    className="rounded-md border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[9px] text-slate-400"
                                  >
                                    {packageLabel(item)}
                                  </span>
                                ))}
                              </div>

                              {request.note && (
                                <p className="mt-3 line-clamp-2 max-w-xl text-xs leading-5 text-slate-400">
                                  {request.note}
                                </p>
                              )}
                            </div>

                            <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
                              <StatusBadge status={request.status} />
                              <span className="text-xs font-semibold text-slate-300">
                                {request.quotedKes !== null
                                  ? money(request.quotedKes)
                                  : money(request.totalKes)}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                            <span>
                              {request.quotedKes !== null
                                ? "Quotation issued"
                                : "Awaiting quotation"}
                            </span>
                            <span>{formatDate(request.createdAt)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                {!requestsQuery.isLoading &&
                  !requestsQuery.isError &&
                  filteredRequests.length === 0 && (
                    <EmptyState
                      title={
                        requests.length === 0
                          ? "No customer requests yet"
                          : "No matching requests"
                      }
                      description={
                        requests.length === 0
                          ? "No requests are currently being returned by the Service Desk API. New customer submissions should appear here after the next refresh."
                          : "Try changing your search, status filter or closed-request setting."
                      }
                    />
                  )}
              </>
            ) : (
              <div className="space-y-5 p-5">
                <div>
                  <h3 className="text-sm font-semibold">
                    Service Desk lifecycle
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Current backend-supported request stages.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      status: "new" as Status,
                      description:
                        "Customer submits a free request for review.",
                    },
                    {
                      status: "quoted" as Status,
                      description:
                        "GRIDSCOUT reviews scope and issues a quotation.",
                    },
                    {
                      status: "in_progress" as Status,
                      description:
                        "Work is recorded as in progress.",
                    },
                    {
                      status: "delivered" as Status,
                      description:
                        "Work is marked as delivered.",
                    },
                    {
                      status: "declined" as Status,
                      description:
                        "Request is declined by operations.",
                    },
                    {
                      status: "cancelled" as Status,
                      description:
                        "Request is cancelled.",
                    },
                  ].map((item, index) => (
                    <div
                      key={item.status}
                      className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-black/15 p-4"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-xs font-bold text-emerald-300">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">
                          {STATUS_LABELS[item.status]}
                        </p>
                        <p className="mt-1 text-[10px] leading-5 text-slate-500">
                          {item.description}
                        </p>
                      </div>

                      <span className="text-lg font-semibold text-emerald-300">
                        {count(item.status)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-4">
                  <p className="text-xs font-semibold text-amber-200">
                    Approval and payment controls are not connected yet.
                  </p>
                  <p className="mt-2 text-xs leading-5 text-amber-100/60">
                    The current backend supports submission, quotation,
                    status updates and internal notes. Customer quote
                    approval, verified payment, assignment history and
                    delivery evidence require additional backend work.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Detail panel */}
          <aside className="min-w-0 rounded-2xl border border-white/[0.07] bg-[#101914]">
            {selected ? (
              <>
                <div className="border-b border-white/[0.07] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] text-emerald-300">
                        FIX-{String(selected.id).padStart(5, "0")}
                      </p>
                      <h2 className="mt-2 text-lg font-semibold">
                        Request details
                      </h2>
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    Review the submitted scope and manage its current stage.
                  </p>
                </div>

                <div className="space-y-6 p-5">
                  {/* Business */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Business
                    </p>
                    <h3 className="mt-2 text-base font-semibold">
                      {selected.business.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {selected.business.area || "Area unavailable"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Lead reference #{selected.leadId}
                    </p>
                  </div>

                  {/* Request value */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
                      <p className="text-[10px] text-slate-500">
                        Package list value
                      </p>
                      <p className="mt-2 text-xs font-semibold">
                        {money(selected.totalKes)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
                      <p className="text-[10px] text-slate-500">
                        GRIDSCOUT quote
                      </p>
                      <p className="mt-2 text-xs font-semibold text-emerald-300">
                        {selected.quotedKes !== null
                          ? money(selected.quotedKes)
                          : "Not quoted"}
                      </p>
                    </div>
                  </div>

                  {/* Packages */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Requested services
                    </p>

                    <div className="mt-3 space-y-2">
                      {selected.packages.map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/15 p-3"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-xs text-emerald-300">
                            ✓
                          </span>
                          <span className="text-xs font-medium text-slate-300">
                            {packageLabel(item)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Customer note */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Customer instructions
                    </p>
                    <div className="mt-2 rounded-xl border border-white/[0.06] bg-black/20 p-4">
                      {selected.note ? (
                        <p className="whitespace-pre-wrap text-xs leading-6 text-slate-300">
                          {selected.note}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-600">
                          No additional instructions supplied.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quotation */}
                  {canQuote && (
                    <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.045] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                        Prepare quotation
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Enter the amount you intend to quote. Submitting
                        changes the request to Quoted.
                      </p>

                      <label className="mt-4 block text-[10px] font-semibold text-slate-400">
                        Quotation amount (KES)
                      </label>

                      <input
                        type="number"
                        min="1"
                        max="10000000"
                        step="1"
                        value={quoteDraft}
                        onChange={(event) =>
                          setQuoteDraft(event.target.value)
                        }
                        placeholder="e.g. 25000"
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/50"
                      />

                      <button
                        onClick={sendQuote}
                        disabled={
                          updateRequest.isPending || !quoteDraft.trim()
                        }
                        className="mt-3 w-full rounded-xl bg-emerald-400 px-4 py-3 text-xs font-bold text-[#07110c] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {updateRequest.isPending
                          ? "Submitting..."
                          : "Issue quotation"}
                      </button>
                    </div>
                  )}

                  {/* Existing quotation */}
                  {selected.quotedKes !== null && (
                    <div className="rounded-xl border border-violet-400/15 bg-violet-400/[0.045] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-300">
                        Quotation on record
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {money(selected.quotedKes)}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        The quotation is recorded. Customer approval and
                        payment verification are not yet connected to this
                        workflow.
                      </p>
                    </div>
                  )}

                  {/* Internal note */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Internal operations note
                    </label>

                    <textarea
                      value={noteDraft}
                      onChange={(event) =>
                        setNoteDraft(event.target.value)
                      }
                      maxLength={1000}
                      rows={4}
                      placeholder="Record an internal review note..."
                      className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-5 text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/50"
                    />

                    <p className="mt-1 text-right text-[10px] text-slate-600">
                      {noteDraft.length}/1000
                    </p>

                    <button
                      onClick={saveInternalNote}
                      disabled={
                        updateRequest.isPending || !noteDraft.trim()
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 px-4 py-3 text-xs font-semibold text-slate-200 transition hover:border-emerald-400/40 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Save internal note
                    </button>

                    {selected.adminNote && (
                      <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 p-3">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          Saved internal note
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-400">
                          {selected.adminNote}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Status actions */}
                  {!isTerminal && (
                    <div className="space-y-3 border-t border-white/[0.07] pt-5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Operations actions
                      </p>

                      {selected.status === "quoted" && (
                        <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-4">
                          <p className="text-xs font-semibold text-amber-200">
                            Awaiting customer approval and verified payment
                          </p>
                          <p className="mt-2 text-[11px] leading-5 text-amber-100/60">
                            Do not begin fulfilment from this screen yet.
                            The approval and payment verification controls
                            have not been implemented.
                          </p>
                        </div>
                      )}

                      {canDecline && (
                        <button
                          onClick={declineRequest}
                          disabled={updateRequest.isPending}
                          className="w-full rounded-xl border border-red-400/20 px-4 py-3 text-xs font-semibold text-red-300 transition hover:bg-red-400/[0.07] disabled:opacity-40"
                        >
                          Decline request
                        </button>
                      )}

                      {canCancel && (
                        <button
                          onClick={cancelRequest}
                          disabled={updateRequest.isPending}
                          className="w-full rounded-xl border border-white/10 px-4 py-3 text-xs font-semibold text-slate-400 transition hover:border-white/20 hover:text-white disabled:opacity-40"
                        >
                          Cancel request
                        </button>
                      )}
                    </div>
                  )}

                  {isTerminal && (
                    <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
                      <p className="text-xs font-semibold text-slate-300">
                        This request is closed.
                      </p>
                      <p className="mt-2 text-[11px] leading-5 text-slate-500">
                        Its current status is {STATUS_LABELS[selected.status]}.
                        The backend does not permit further status transitions.
                      </p>
                    </div>
                  )}

                  {/* Feedback */}
                  {actionMessage && (
                    <div
                      className={`rounded-xl border p-3 text-xs leading-5 ${
                        actionError
                          ? "border-red-400/20 bg-red-400/[0.06] text-red-300"
                          : "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300"
                      }`}
                    >
                      {actionMessage}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="border-t border-white/[0.07] pt-4">
                    <div className="flex justify-between gap-3 text-[10px] text-slate-500">
                      <span>Created</span>
                      <span className="text-right">
                        {formatDate(selected.createdAt)}
                      </span>
                    </div>

                    <div className="mt-2 flex justify-between gap-3 text-[10px] text-slate-500">
                      <span>Submission fee</span>
                      <span>
                        {selected.feeCredits === 0
                          ? "Free submission"
                          : `${selected.feeCredits} credits`}
                      </span>
                    </div>

                    <div className="mt-2 flex justify-between gap-3 text-[10px] text-slate-500">
                      <span>Request ID</span>
                      <span className="font-mono text-slate-400">
                        #{selected.id}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-10 text-center">
                <p className="text-sm font-semibold text-slate-300">
                  Select a request
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Choose a customer request from the queue to inspect its
                  details and manage its quotation.
                </p>
              </div>
            )}
          </aside>
        </section>

        {/* Footer */}
        <footer className="flex flex-col justify-between gap-3 border-t border-white/[0.07] py-5 text-[10px] text-slate-600 sm:flex-row">
          <span>GRIDSCOUT SERVICE DESK · OPERATIONS</span>
          <span>Live database requests · Admin-authorised actions</span>
        </footer>
      </div>
    </main>
  );
}
