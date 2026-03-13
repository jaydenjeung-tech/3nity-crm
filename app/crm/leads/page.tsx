// app/crm/leads/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: SearchParams;
};

type LeadRow = {
  id: string | null;
  clinic_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  treatment_interest: string | null;
  status: string | null;
  notes: string | null;
  assigned_to: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type NormalizedStatus =
  | "new"
  | "contacted"
  | "consult_scheduled"
  | "accepted"
  | "completed";

const STATUS_OPTIONS: { value: NormalizedStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "consult_scheduled", label: "Consult" },
  { value: "accepted", label: "Accepted" },
  { value: "completed", label: "Completed" },
];

function getParam(
  sp: Record<string, string | string[] | undefined>,
  key: string
) {
  const v = sp?.[key];
  if (Array.isArray(v)) return v[0] ?? "";
  return typeof v === "string" ? v : "";
}

function normalizeLeadStatus(value: string | null): NormalizedStatus {
  const s = String(value ?? "").trim().toLowerCase();

  if (["new", "new_lead", "lead", "inquiry", "open"].includes(s)) {
    return "new";
  }

  if (
    [
      "attempted_contact",
      "contacted",
      "called",
      "follow_up",
      "followup_needed",
      "follow-up",
    ].includes(s)
  ) {
    return "contacted";
  }

  if (
    [
      "consult",
      "consult_scheduled",
      "consultation",
      "scheduled",
      "consult_completed",
      "treatment_plan_presented",
      "treatment_plan",
      "plan_sent",
      "proposal_sent",
    ].includes(s)
  ) {
    return "consult_scheduled";
  }

  if (["accepted", "won"].includes(s)) {
    return "accepted";
  }

  if (["completed", "converted", "closed"].includes(s)) {
    return "completed";
  }

  return "new";
}

function getStatusLabel(value: string | null) {
  const normalized = normalizeLeadStatus(value);
  return (
    STATUS_OPTIONS.find((s) => s.value === normalized)?.label ?? normalized
  );
}

function getStatusBadgeClass(status: string | null) {
  const normalized = normalizeLeadStatus(status);

  switch (normalized) {
    case "new":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "contacted":
      return "border-blue-200 bg-blue-100 text-blue-700";
    case "consult_scheduled":
      return "border-amber-200 bg-amber-100 text-amber-700";
    case "accepted":
      return "border-emerald-200 bg-emerald-100 text-emerald-700";
    case "completed":
      return "border-green-200 bg-green-100 text-green-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function formatTreatment(value: string | null) {
  if (!value) return "-";

  switch (value) {
    case "night_guard":
      return "Night Guard";
    default:
      return value
        .split("_")
        .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
        .join(" ");
  }
}

function isValidUuid(value: string | null | undefined) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function LeadOpenButton({ leadId }: { leadId: string | null }) {
  if (!isValidUuid(leadId)) {
    return (
      <span className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-extrabold text-red-600">
        Missing ID
      </span>
    );
  }

  return (
    <Link
      href={`/crm/leads/${leadId}`}
      className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-900"
    >
      Open
    </Link>
  );
}

function LeadNameLink({
  leadId,
  name,
}: {
  leadId: string | null;
  name: string | null;
}) {
  const label = name || "Unnamed Lead";

  if (!isValidUuid(leadId)) {
    return (
      <span className="text-[22px] font-extrabold leading-tight text-slate-400">
        {label}
      </span>
    );
  }

  return (
    <Link
      href={`/crm/leads/${leadId}`}
      className="text-[22px] font-extrabold leading-tight text-slate-900 no-underline"
    >
      {label}
    </Link>
  );
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const statusFilter = getParam(sp ?? {}, "status");

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: myProfileRows, error: myProfileError } = await supabase
    .from("profiles")
    .select("id, clinic_id, full_name, role")
    .eq("id", user.id);

  const myProfile = myProfileRows?.[0] ?? null;

  if (myProfileError || !myProfile?.clinic_id) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h1 className="mt-0 text-2xl font-extrabold text-slate-900">Leads</h1>
        <p className="font-bold text-red-700">
          profiles 테이블에서 clinic_id를 찾지 못했습니다.
        </p>
        <p>
          current user.id: <b>{user.id}</b>
        </p>
        <p>
          profile error: <b>{myProfileError?.message ?? "none"}</b>
        </p>
        <p>
          profile rows: <b>{myProfileRows?.length ?? 0}</b>
        </p>
        <p>
          found clinic_id: <b>{myProfile?.clinic_id ?? "null"}</b>
        </p>
      </div>
    );
  }

  const clinicId = myProfile.clinic_id;

  const { data: leads, error } = await supabase
    .from("leads")
    .select(`
      id,
      clinic_id,
      full_name,
      phone,
      email,
      source,
      treatment_interest,
      status,
      notes,
      assigned_to,
      last_contacted_at,
      next_follow_up_at,
      is_active,
      created_at,
      updated_at
    `)
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h1 className="mt-0 text-2xl font-extrabold text-slate-900">Leads</h1>
        <p className="text-red-700">Error: {error.message}</p>
      </div>
    );
  }

  const rows = (leads as LeadRow[] | null) ?? [];

  const allActiveLeads = rows.filter((lead) => lead.is_active !== false);
  const allInactiveLeads = rows.filter((lead) => lead.is_active === false);

  const isValidStatusFilter = STATUS_OPTIONS.some(
    (s) => s.value === statusFilter
  );

  const activeLeads =
    statusFilter && isValidStatusFilter
      ? allActiveLeads.filter(
          (lead) => normalizeLeadStatus(lead.status) === statusFilter
        )
      : allActiveLeads;

  const inactiveLeads =
    statusFilter && isValidStatusFilter
      ? allInactiveLeads.filter(
          (lead) => normalizeLeadStatus(lead.status) === statusFilter
        )
      : allInactiveLeads;

  const filterLabel =
    statusFilter && isValidStatusFilter
      ? STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label ?? ""
      : "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="m-0 text-3xl font-extrabold leading-tight text-slate-900">
            Leads
          </h1>
          <p className="m-0 text-sm text-slate-500">
            Manage patient inquiries, follow-ups, and conversion progress.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/crm"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-900"
          >
            Pipeline
          </Link>
          <Link
            href="/crm/leads/new"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white"
          >
            + New Lead
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/crm/leads"
            className={`inline-flex items-center rounded-full border px-3 py-2 text-sm font-extrabold ${
              !statusFilter || !isValidStatusFilter
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            All
          </Link>

          {STATUS_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={`/crm/leads?status=${option.value}`}
              className={`inline-flex items-center rounded-full border px-3 py-2 text-sm font-extrabold ${
                statusFilter === option.value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>

        {statusFilter && isValidStatusFilter ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-slate-600">Filter:</span>
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 font-extrabold text-indigo-700">
                {filterLabel}
              </span>
            </div>

            <Link
              href="/crm/leads"
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-900"
            >
              Clear Filter
            </Link>
          </div>
        ) : null}
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-extrabold text-slate-900">
            Active Leads
          </h2>
          <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-slate-200 px-2 py-1 text-xs font-extrabold text-slate-900">
            {activeLeads.length}
          </span>
        </div>

        {activeLeads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-slate-500">
            {statusFilter && isValidStatusFilter
              ? `No active leads found for "${filterLabel}".`
              : "No active leads yet. Add your first lead to start tracking inquiries."}
          </div>
        ) : (
          <div className="grid gap-4">
            {activeLeads.map((lead) => (
              <div
                key={`${lead.id ?? "missing-id"}-${lead.created_at ?? Math.random()}`}
                className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-[1_1_280px]">
                    <LeadNameLink leadId={lead.id} name={lead.full_name} />

                    <div className="mt-1 text-sm font-semibold text-slate-500">
                      {formatTreatment(lead.treatment_interest)}
                      {lead.source ? ` • ${lead.source}` : ""}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-extrabold ${getStatusBadgeClass(
                        lead.status
                      )}`}
                    >
                      {getStatusLabel(lead.status)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.35px] text-slate-500">
                      Phone
                    </div>
                    <div className="break-words text-sm font-bold text-slate-900">
                      {lead.phone || "-"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.35px] text-slate-500">
                      Email
                    </div>
                    <div className="break-words text-sm font-bold text-slate-900">
                      {lead.email || "-"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.35px] text-slate-500">
                      Assigned To
                    </div>
                    <div className="break-words text-sm font-bold text-slate-900">
                      {lead.assigned_to || "-"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.35px] text-slate-500">
                      Last Contact
                    </div>
                    <div className="break-words text-sm font-bold text-slate-900">
                      {formatDateTime(lead.last_contacted_at)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.35px] text-slate-500">
                      Next Follow-up
                    </div>
                    <div className="break-words text-sm font-bold text-slate-900">
                      {formatDateTime(lead.next_follow_up_at)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.35px] text-slate-500">
                      Created
                    </div>
                    <div className="break-words text-sm font-bold text-slate-900">
                      {formatDateTime(lead.created_at)}
                    </div>
                  </div>
                </div>

                {lead.notes ? (
                  <div className="mt-3 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
                    {lead.notes}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <LeadOpenButton leadId={lead.id} />

                  {lead.phone ? (
                    <a
                      href={`tel:${lead.phone}`}
                      className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-900"
                    >
                      Call
                    </a>
                  ) : null}

                  {lead.email ? (
                    <a
                      href={`mailto:${lead.email}`}
                      className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-900"
                    >
                      Email
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {inactiveLeads.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-slate-900">
              Inactive Leads
            </h2>
            <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-slate-200 px-2 py-1 text-xs font-extrabold text-slate-900">
              {inactiveLeads.length}
            </span>
          </div>

          <div className="grid gap-4">
            {inactiveLeads.map((lead) => (
              <div
                key={`${lead.id ?? "missing-id"}-${lead.updated_at ?? Math.random()}`}
                className="rounded-[20px] border border-slate-200 bg-white p-4 opacity-80 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-[1_1_280px]">
                    <LeadNameLink leadId={lead.id} name={lead.full_name} />

                    <div className="mt-1 text-sm font-semibold text-slate-500">
                      {formatTreatment(lead.treatment_interest)}
                      {lead.source ? ` • ${lead.source}` : ""}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-extrabold ${getStatusBadgeClass(
                        lead.status
                      )}`}
                    >
                      {getStatusLabel(lead.status)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.35px] text-slate-500">
                      Phone
                    </div>
                    <div className="break-words text-sm font-bold text-slate-900">
                      {lead.phone || "-"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.35px] text-slate-500">
                      Email
                    </div>
                    <div className="break-words text-sm font-bold text-slate-900">
                      {lead.email || "-"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.35px] text-slate-500">
                      Assigned To
                    </div>
                    <div className="break-words text-sm font-bold text-slate-900">
                      {lead.assigned_to || "-"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.35px] text-slate-500">
                      Updated
                    </div>
                    <div className="break-words text-sm font-bold text-slate-900">
                      {formatDateTime(lead.updated_at)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <LeadOpenButton leadId={lead.id} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}