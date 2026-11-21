
import { useMemo, useState } from "react";

type Status =
  | "New"
  | "Reviewed"
  | "Approved"
  | "In Progress"
  | "Quality Check"
  | "Completed"
  | "Rejected";

type Priority = "Critical" | "High" | "Medium" | "Low";

type FixRequest = {
  id: string;
  business: string;
  category: string;
  issue: string;
  recommendation: string;
  location: string;
  contact: string;
  priority: Priority;
  status: Status;
  value: number;
  created: string;
  assignedTo: string;
  notes: string;
};

const INITIAL_REQUESTS: FixRequest[] = [
  {
    id: "FIX-001",
    business: "Westlands Dental Studio",
    category: "Local SEO",
    issue: "Business is difficult to discover in local search results.",
    recommendation:
      "Improve Google Business Profile completeness, location relevance, service pages and local structured data.",
    location: "Westlands, Nairobi",
    contact: "Demo contact",
    priority: "High",
    status: "In Progress",
    value: 39500,
    created: "21 Nov 2026",
    assignedTo: "Operations Team",
    notes: "Demo request. Review location landing page and business profile.",
  },
  {
    id: "FIX-002",
    business: "Urban Bites Restaurant",
    category: "Technical SEO",
    issue: "Important pages have indexing and metadata issues.",
    recommendation:
      "Audit crawlability, canonical tags, metadata and indexation signals.",
    location: "Kilimani, Nairobi",
    contact: "Demo contact",
    priority: "Critical",
    status: "New",
    value: 28000,
    created: "20 Nov 2026",
    assignedTo: "Unassigned",
    notes: "",
  },
  {
    id: "FIX-003",
    business: "Greenline Hardware",
    category: "Website Performance",
    issue: "Slow mobile experience and oversized page assets.",
    recommendation:
      "Optimise images, reduce render-blocking resources and improve Core Web Vitals.",
    location: "Ruiru, Kiambu",
    contact: "Demo contact",
    priority: "Medium",
    status: "Reviewed",
    value: 22000,
    created: "19 Nov 2026",
    assignedTo: "Operations Team",
    notes: "Demo request. Performance audit required before approval.",
  },
  {
    id: "FIX-004",
    business: "Mosaic Restaurant",
    category: "Website & Local SEO",
    issue: "Needs a stronger digital presence and better local discovery.",
    recommendation:
      "Improve website structure, local search signals, menu visibility and conversion paths.",
    location: "Kilimani, Nairobi",
    contact: "Demo contact",
    priority: "High",
    status: "Quality Check",
    value: 65000,
    created: "18 Nov 2026",
    assignedTo: "Operations Team",
    notes: "Demo request. Verify mobile layout and enquiry links.",
  },
  {
    id: "FIX-005",
    business: "Nairobi Auto Care",
    category: "Website Maintenance",
    issue: "Website service information is outdated.",
    recommendation:
      "Update service pages, contact information and conversion points.",
    location: "Ngara, Nairobi",
    contact: "Demo contact",
    priority: "Low",
    status: "Completed",
    value: 15000,
    created: "15 Nov 2026",
    assignedTo: "Operations Team",
    notes: "Demo completion record. No real client delivery is implied.",
  },
];

const STATUSES: Status[] = [
  "New",
  "Reviewed",
  "Approved",
  "In Progress",
  "Quality Check",
  "Completed",
  "Rejected",
];

const PRIORITIES: Priority[] = ["Critical", "High", "Medium", "Low"];

const money = (amount: number) =>
  `KES ${amount.toLocaleString("en-KE")}`;

const statusStyle: Record<Status, string> = {
  New: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  Reviewed: "border-violet-400/25 bg-violet-400/10 text-violet-300",
  Approved: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  "In Progress": "border-amber-400/25 bg-amber-400/10 text-amber-300",
  "Quality Check": "border-cyan-400/25 bg-cyan-400/10 text-cyan-300",
  Completed: "border-green-400/25 bg-green-400/10 text-green-300",
  Rejected: "border-red-400/25 bg-red-400/10 text-red-300",
};

const priorityStyle: Record<Priority, string> = {
  Critical: "text-red-400",
  High: "text-orange-400",
  Medium: "text-amber-300",
  Low: "text-slate-400",
};

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
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${statusStyle[status]}`}
    >
      {status}
    </span>
  );
}

export default function AdminFixes() {
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [selectedId, setSelectedId] = useState(INITIAL_REQUESTS[0].id);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<"Queue" | "Workflow">("Queue");
  const [noteDraft, setNoteDraft] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  const selected = requests.find((request) => request.id === selectedId);

  const updateRequest = (
    id: string,
    updates: Partial<FixRequest>
  ) => {
    setRequests((current) =>
      current.map((request) =>
        request.id === id ? { ...request, ...updates } : request
      )
    );
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const query = search.toLowerCase();

      const matchesSearch =
        !query ||
        request.business.toLowerCase().includes(query) ||
        request.id.toLowerCase().includes(query) ||
        request.category.toLowerCase().includes(query) ||
        request.location.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || request.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All" || request.priority === priorityFilter;

      const matchesCompleted =
        showCompleted || request.status !== "Completed";

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesCompleted
      );
    });
  }, [requests, search, statusFilter, priorityFilter, showCompleted]);

  const count = (status: Status) =>
    requests.filter((request) => request.status === status).length;

  const activeRequests = requests.filter(
    (request) => !["Completed", "Rejected"].includes(request.status)
  );

  const pipelineValue = activeRequests.reduce(
    (sum, request) => sum + request.value,
    0
  );

  const completedValue = requests
    .filter((request) => request.status === "Completed")
    .reduce((sum, request) => sum + request.value, 0);

  const saveNote = () => {
    if (!selected || !noteDraft.trim()) return;

    const timestamp = new Date().toLocaleString("en-KE");

    updateRequest(selected.id, {
      notes: selected.notes
        ? `${selected.notes}\n\n[${timestamp}] ${noteDraft.trim()}`
        : `[${timestamp}] ${noteDraft.trim()}`,
    });

    setNoteDraft("");
  };

  const assignToMe = () => {
    if (!selected) return;
    updateRequest(selected.id, { assignedTo: "You (Admin)" });
  };

  const nextStatus = (status: Status): Status | null => {
    const index = STATUSES.indexOf(status);
    if (index < 0 || index >= 5) return null;
    return STATUSES[index + 1];
  };

  const advanceRequest = () => {
    if (!selected) return;
    const next = nextStatus(selected.status);
    if (next) updateRequest(selected.id, { status: next });
  };

  const selectRequest = (id: string) => {
    setSelectedId(id);
    setNoteDraft("");
  };

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
              Manage client fixes, coordinate fulfilment and track delivery
              quality from one operations workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              Demo environment
            </span>
            <span className="rounded-full border border-white/10 px-3 py-2 text-[10px] font-medium text-slate-400">
              LOCAL PREVIEW · NOT CONNECTED
            </span>
          </div>
        </header>

        {/* Metrics */}
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <Metric
            label="Open requests"
            value={activeRequests.length}
            detail="Awaiting final completion"
            accent="text-emerald-300"
          />
          <Metric
            label="New requests"
            value={count("New")}
            detail="Require initial review"
            accent="text-sky-300"
          />
          <Metric
            label="In progress"
            value={count("In Progress")}
            detail="Currently being worked on"
            accent="text-amber-300"
          />
          <Metric
            label="Quality check"
            value={count("Quality Check")}
            detail="Awaiting verification"
            accent="text-cyan-300"
          />
          <Metric
            label="Completed value"
            value={money(completedValue)}
            detail="Illustrative demo value"
            accent="text-green-300"
          />
        </section>

        {/* Pipeline summary */}
        <section className="rounded-2xl border border-emerald-400/15 bg-gradient-to-r from-emerald-400/[0.09] to-transparent p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                Active fulfilment pipeline
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {money(pipelineValue)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Combined illustrative value of non-completed requests
              </p>
            </div>
            <div className="flex flex-wrap gap-5">
              {(["New", "Reviewed", "Approved", "In Progress", "Quality Check"] as Status[]).map(
                (status) => (
                  <div key={status}>
                    <p className="text-xl font-semibold">
                      {count(status)}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {status}
                    </p>
                  </div>
                )
              )}
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
                  Review and manage fulfilment requests
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
                <div className="grid gap-3 border-b border-white/[0.06] p-4 sm:grid-cols-2 lg:grid-cols-[1fr_150px_140px]">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search business, ID, category..."
                    className="min-w-0 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/50"
                  />

                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="rounded-xl border border-white/10 bg-[#111b17] px-3 py-3 text-xs text-slate-300 outline-none focus:border-emerald-400/50"
                  >
                    <option value="All">All statuses</option>
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <select
                    value={priorityFilter}
                    onChange={(event) => setPriorityFilter(event.target.value)}
                    className="rounded-xl border border-white/10 bg-[#111b17] px-3 py-3 text-xs text-slate-300 outline-none focus:border-emerald-400/50"
                  >
                    <option value="All">All priorities</option>
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
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
                      checked={showCompleted}
                      onChange={(event) =>
                        setShowCompleted(event.target.checked)
                      }
                      className="accent-emerald-400"
                    />
                    Show completed
                  </label>
                </div>

                {/* Request list */}
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
                              {request.id}
                            </span>
                            <span className={`text-[10px] font-bold ${priorityStyle[request.priority]}`}>
                              ● {request.priority}
                            </span>
                          </div>

                          <h3 className="mt-2 truncate text-sm font-semibold text-white">
                            {request.business}
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            {request.category} · {request.location}
                          </p>

                          <p className="mt-3 line-clamp-2 max-w-xl text-xs leading-5 text-slate-400">
                            {request.issue}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
                          <StatusBadge status={request.status} />
                          <span className="text-xs font-semibold text-slate-300">
                            {money(request.value)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                        <span>Assigned: {request.assignedTo}</span>
                        <span>{request.created}</span>
                      </div>
                    </button>
                  ))}

                  {filteredRequests.length === 0 && (
                    <div className="p-12 text-center">
                      <p className="text-sm font-semibold text-slate-300">
                        No matching requests
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Try changing your search or filters.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-5 p-5">
                <div>
                  <h3 className="text-sm font-semibold">Fulfilment lifecycle</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    The stages every fix should pass through.
                  </p>
                </div>

                <div className="space-y-3">
                  {STATUSES.map((status, index) => (
                    <div
                      key={status}
                      className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-black/15 p-4"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-xs font-bold text-emerald-300">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{status}</p>
                        <p className="mt-1 text-[10px] text-slate-500">
                          {status === "New" && "Request received and awaiting review"}
                          {status === "Reviewed" && "Scope and evidence assessed"}
                          {status === "Approved" && "Work authorised for fulfilment"}
                          {status === "In Progress" && "Assigned work being executed"}
                          {status === "Quality Check" && "Review deliverables and evidence"}
                          {status === "Completed" && "Delivery verified and closed"}
                          {status === "Rejected" && "Request declined with a reason recorded"}
                        </p>
                      </div>

                      <span className="text-lg font-semibold text-emerald-300">
                        {count(status)}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-4 text-xs leading-5 text-amber-200/80">
                  Workflow changes in this preview are local only. Backend
                  authorisation, audit history and persistent assignments are
                  not connected yet.
                </p>
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
                        {selected.id}
                      </p>
                      <h2 className="mt-2 text-lg font-semibold">
                        Request details
                      </h2>
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Inspect scope, update progress and record internal notes.
                  </p>
                </div>

                <div className="space-y-6 p-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Business
                    </p>
                    <h3 className="mt-2 text-base font-semibold">
                      {selected.business}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {selected.location}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selected.contact}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
                      <p className="text-[10px] text-slate-500">Category</p>
                      <p className="mt-2 text-xs font-semibold">
                        {selected.category}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
                      <p className="text-[10px] text-slate-500">Est. value</p>
                      <p className="mt-2 text-xs font-semibold text-emerald-300">
                        {money(selected.value)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Issue identified
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {selected.issue}
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.045] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                      Recommended action
                    </p>
                    <p className="mt-2 text-xs leading-6 text-slate-300">
                      {selected.recommendation}
                    </p>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Workflow status
                      </label>
                    </div>

                    <select
                      value={selected.status}
                      onChange={(event) =>
                        updateRequest(selected.id, {
                          status: event.target.value as Status,
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#111b17] px-4 py-3 text-xs text-white outline-none focus:border-emerald-400/50"
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    {nextStatus(selected.status) && (
                      <button
                        onClick={advanceRequest}
                        className="mt-3 w-full rounded-xl bg-emerald-400 px-4 py-3 text-xs font-bold text-[#07110c] transition hover:bg-emerald-300"
                      >
                        Advance to {nextStatus(selected.status)} →
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Priority
                    </label>
                    <select
                      value={selected.priority}
                      onChange={(event) =>
                        updateRequest(selected.id, {
                          priority: event.target.value as Priority,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#111b17] px-4 py-3 text-xs text-white outline-none focus:border-emerald-400/50"
                    >
                      {PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Assigned to
                      </label>
                      <button
                        onClick={assignToMe}
                        className="text-[10px] font-semibold text-emerald-300 hover:text-emerald-200"
                      >
                        Assign to me
                      </button>
                    </div>

                    <input
                      value={selected.assignedTo}
                      onChange={(event) =>
                        updateRequest(selected.id, {
                          assignedTo: event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white outline-none focus:border-emerald-400/50"
                      placeholder="Enter assignee"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Internal notes
                    </label>

                    <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-xl border border-white/[0.06] bg-black/20 p-3">
                      {selected.notes ? (
                        <p className="whitespace-pre-wrap text-xs leading-5 text-slate-400">
                          {selected.notes}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-600">
                          No notes recorded yet.
                        </p>
                      )}
                    </div>

                    <textarea
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      placeholder="Add an internal update..."
                      rows={3}
                      className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/50"
                    />

                    <button
                      onClick={saveNote}
                      disabled={!noteDraft.trim()}
                      className="mt-2 w-full rounded-xl border border-white/10 px-4 py-3 text-xs font-semibold text-slate-200 transition hover:border-emerald-400/40 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Save local note
                    </button>
                  </div>

                  <div className="border-t border-white/[0.07] pt-4">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Created</span>
                      <span>{selected.created}</span>
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-slate-500">
                      <span>Environment</span>
                      <span className="text-amber-300">Demo record</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-10 text-center text-sm text-slate-500">
                Select a request to inspect its details.
              </div>
            )}
          </aside>
        </section>

        {/* Footer note */}
        <footer className="flex flex-col justify-between gap-3 border-t border-white/[0.07] py-5 text-[10px] text-slate-600 sm:flex-row">
          <span>GRIDSCOUT SERVICE DESK · FIX OPERATIONS</span>
          <span>
            Frontend preview · Local state only · No client data submitted
          </span>
        </footer>
      </div>
    </main>
  );
}
