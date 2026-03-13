// app/crm/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type LeadRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  treatment_interest: string | null;
  created_at: string | null;
  status: string | null;
};

type TaskRow = {
  id: string;
  due_at: string | null;
  status: string | null;
};

type PipelineKey =
  | "new"
  | "contacted"
  | "consult_scheduled"
  | "treatment_plan_sent"
  | "accepted"
  | "completed"
  | "lost";

type PipelineColumnDef = {
  key: PipelineKey;
  label: string;
  tone:
    | "slate"
    | "blue"
    | "amber"
    | "violet"
    | "emerald"
    | "green"
    | "rose";
};

const PIPELINE_COLUMNS: PipelineColumnDef[] = [
  { key: "new", label: "New", tone: "slate" },
  { key: "contacted", label: "Contacted", tone: "blue" },
  { key: "consult_scheduled", label: "Consult Scheduled", tone: "amber" },
  { key: "treatment_plan_sent", label: "Treatment Plan", tone: "violet" },
  { key: "accepted", label: "Accepted", tone: "emerald" },
  { key: "completed", label: "Completed", tone: "green" },
  { key: "lost", label: "Lost", tone: "rose" },
];

function startOfTodayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function normalizeLeadStatus(value: string | null): PipelineKey {
  const status = String(value ?? "").trim().toLowerCase();

  if (
    ["new", "new_lead", "lead", "inquiry", "open"].includes(status)
  ) {
    return "new";
  }

  if (
    ["contacted", "called", "follow_up", "follow-up"].includes(status)
  ) {
    return "contacted";
  }

  if (
    ["consult", "consult_scheduled", "consultation", "scheduled"].includes(
      status
    )
  ) {
    return "consult_scheduled";
  }

  if (
    ["treatment_plan", "treatment_plan_sent", "plan_sent", "proposal_sent"].includes(
      status
    )
  ) {
    return "treatment_plan_sent";
  }

  if (
    ["accepted", "won", "converted"].includes(status)
  ) {
    return "accepted";
  }

  if (
    ["completed", "closed"].includes(status)
  ) {
    return "completed";
  }

  if (
    ["lost", "cancelled", "canceled", "no_show", "rejected"].includes(status)
  ) {
    return "lost";
  }

  return "new";
}

function normalizeTaskStatus(value: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function formatDate(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

function getToneClasses(
  tone: PipelineColumnDef["tone"],
  kind: "header" | "badge" | "card"
) {
  const map = {
    slate: {
      header: "text-slate-800",
      badge: "bg-slate-100 text-slate-700",
      card: "border-slate-200 bg-slate-50/60",
    },
    blue: {
      header: "text-blue-800",
      badge: "bg-blue-100 text-blue-700",
      card: "border-blue-200 bg-blue-50/60",
    },
    amber: {
      header: "text-amber-800",
      badge: "bg-amber-100 text-amber-700",
      card: "border-amber-200 bg-amber-50/60",
    },
    violet: {
      header: "text-violet-800",
      badge: "bg-violet-100 text-violet-700",
      card: "border-violet-200 bg-violet-50/60",
    },
    emerald: {
      header: "text-emerald-800",
      badge: "bg-emerald-100 text-emerald-700",
      card: "border-emerald-200 bg-emerald-50/60",
    },
    green: {
      header: "text-green-800",
      badge: "bg-green-100 text-green-700",
      card: "border-green-200 bg-green-50/60",
    },
    rose: {
      header: "text-rose-800",
      badge: "bg-rose-100 text-rose-700",
      card: "border-rose-200 bg-rose-50/60",
    },
  };

  return map[tone][kind];
}

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: number;
  subtext?: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </div>
      {subtext ? (
        <div className="mt-2 text-sm text-slate-500">{subtext}</div>
      ) : null}
    </div>
  );
}

function LeadMiniCard({ lead }: { lead: LeadRow }) {
  return (
    <Link
      href={`/crm/leads/${lead.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="line-clamp-1 text-sm font-bold text-slate-900">
        {lead.full_name?.trim() || "Unnamed Lead"}
      </div>

      {lead.treatment_interest ? (
        <div className="mt-2 line-clamp-2 text-sm text-slate-600">
          {lead.treatment_interest}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span className="truncate">{lead.phone || "-"}</span>
        <span>{formatDate(lead.created_at) || "-"}</span>
      </div>
    </Link>
  );
}

function ActionCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="text-[20px] font-extrabold tracking-tight text-[#0d2a66]">
        {title}
      </div>
      <p className="mt-5 text-[18px] leading-9 text-slate-600">{description}</p>
    </Link>
  );
}

export default async function CRMPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: leads }, { data: tasks }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, full_name, phone, treatment_interest, created_at, status")
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("id, due_at, status")
      .order("due_at", { ascending: true }),
  ]);

  const leadRows = (leads ?? []) as LeadRow[];
  const taskRows = (tasks ?? []) as TaskRow[];

  const today = startOfTodayLocal();

  const openTasks = taskRows.filter((task) => {
    const status = normalizeTaskStatus(task.status);
    return !["done", "completed", "cancelled", "canceled"].includes(status);
  }).length;

  const overdueTasks = taskRows.filter((task) => {
    const status = normalizeTaskStatus(task.status);
    if (["done", "completed", "cancelled", "canceled"].includes(status)) {
      return false;
    }
    if (!task.due_at) return false;
    return new Date(task.due_at) < today;
  }).length;

  const pipelineMap: Record<PipelineKey, LeadRow[]> = {
    new: [],
    contacted: [],
    consult_scheduled: [],
    treatment_plan_sent: [],
    accepted: [],
    completed: [],
    lost: [],
  };

  for (const lead of leadRows) {
    const key = normalizeLeadStatus(lead.status);
    pipelineMap[key].push(lead);
  }

  const activePipelineCount =
    pipelineMap.new.length +
    pipelineMap.contacted.length +
    pipelineMap.consult_scheduled.length +
    pipelineMap.treatment_plan_sent.length +
    pipelineMap.accepted.length;

  return (
    <div className="space-y-7">
       <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Pipeline"
          value={activePipelineCount}
          subtext="New through accepted"
        />
        <StatCard
          label="Completed"
          value={pipelineMap.completed.length}
        />
        <StatCard
          label="Lost"
          value={pipelineMap.lost.length}
        />
        <StatCard
          label="Open Tasks"
          value={openTasks}
          subtext={
            overdueTasks > 0 ? `${overdueTasks} overdue` : "No overdue tasks"
          }
        />
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-[#0d2a66]">
              Lead Pipeline
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Each column shows the current stage of your patient acquisition flow.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-4 2xl:grid-cols-7">
          {PIPELINE_COLUMNS.map((column) => {
            const items = pipelineMap[column.key];
            const headerClass = getToneClasses(column.tone, "header");
            const badgeClass = getToneClasses(column.tone, "badge");
            const cardClass = getToneClasses(column.tone, "card");

            return (
              <div
                key={column.key}
                className={`rounded-[28px] border p-4 ${cardClass}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className={`text-sm font-extrabold tracking-tight ${headerClass}`}>
                    {column.label}
                  </h3>
                  <span
                    className={`inline-flex min-w-8 items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold ${badgeClass}`}
                  >
                    {items.length}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {items.length > 0 ? (
                    items.slice(0, 6).map((lead) => (
                      <LeadMiniCard key={lead.id} lead={lead} />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-5 text-sm text-slate-400">
                      No leads in this stage.
                    </div>
                  )}

                  {items.length > 6 ? (
                    <Link
                      href={`/crm/leads?status=${column.key}`}
                      className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      View {items.length - 6} more
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white px-7 py-8 shadow-sm md:px-8 md:py-9">
        <h2 className="text-3xl font-extrabold tracking-tight text-[#0d2a66]">
          CRM Actions
        </h2>

        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <ActionCard
            title="Leads"
            description="View, search, filter, and manage all patient inquiries and conversion progress."
            href="/crm/leads"
          />
          <ActionCard
            title="New Lead"
            description="Register a new patient inquiry from phone, text, walk-in, or front desk intake."
            href="/crm/leads/new"
          />
          <ActionCard
            title="Main Dashboard"
            description="Return to the main system dashboard for cross-module summaries and navigation."
            href="/dashboard"
          />
        </div>
      </section>
    </div>
  );
}