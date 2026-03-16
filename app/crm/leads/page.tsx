import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { CSSProperties } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import TextButton from "./TextButton"; // ← 추가

export const dynamic = "force-dynamic";

type SearchParams =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: SearchParams;
};

const STATUS_OPTIONS = [
  { value: "new_lead", label: "New Lead" },
  { value: "attempted_contact", label: "Attempted Contact" },
  { value: "contacted", label: "Contacted" },
  { value: "consult_scheduled", label: "Consult Scheduled" },
  { value: "consult_completed", label: "Consult Completed" },
  { value: "treatment_plan_presented", label: "Treatment Plan Presented" },
  { value: "followup_needed", label: "Follow-up Needed" },
  { value: "accepted", label: "Accepted" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
  { value: "inactive", label: "Inactive" },
] as const;

type LeadStatus = (typeof STATUS_OPTIONS)[number]["value"] | string | null;

type LeadRow = {
  id: string;
  clinic_id: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  treatment_interest: string | null;
  status: LeadStatus;
  notes: string | null;
  assigned_to: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  clinic_id: string | null;
  role: string | null;
};

function getParam(
  value: string | string[] | undefined,
  fallback = ""
): string {
  if (Array.isArray(value)) return String(value[0] ?? fallback);
  return String(value ?? fallback);
}

function parseDate(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfTodayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function endOfTodayLocal() {
  const start = startOfTodayLocal();
  return new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    23,
    59,
    59,
    999
  );
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function isClosedStatus(status: LeadStatus) {
  return status === "converted" || status === "lost" || status === "inactive";
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function formatShortDate(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

function getStatusLabel(status: LeadStatus) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? (status || "-");
}

function getStatusTone(status: LeadStatus): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid",
    whiteSpace: "nowrap",
  };

  switch (status) {
    case "new_lead":
      return {
        ...base,
        background: "#eff6ff",
        color: "#1d4ed8",
        borderColor: "#bfdbfe",
      };
    case "attempted_contact":
    case "followup_needed":
      return {
        ...base,
        background: "#fff7ed",
        color: "#c2410c",
        borderColor: "#fdba74",
      };
    case "contacted":
      return {
        ...base,
        background: "#ecfeff",
        color: "#0f766e",
        borderColor: "#a5f3fc",
      };
    case "consult_scheduled":
      return {
        ...base,
        background: "#f5f3ff",
        color: "#6d28d9",
        borderColor: "#ddd6fe",
      };
    case "consult_completed":
      return {
        ...base,
        background: "#eef2ff",
        color: "#4338ca",
        borderColor: "#c7d2fe",
      };
    case "treatment_plan_presented":
      return {
        ...base,
        background: "#fefce8",
        color: "#a16207",
        borderColor: "#fde68a",
      };
    case "accepted":
    case "converted":
      return {
        ...base,
        background: "#ecfdf5",
        color: "#047857",
        borderColor: "#a7f3d0",
      };
    case "lost":
    case "inactive":
      return {
        ...base,
        background: "#f8fafc",
        color: "#475569",
        borderColor: "#cbd5e1",
      };
    default:
      return {
        ...base,
        background: "#f8fafc",
        color: "#334155",
        borderColor: "#cbd5e1",
      };
  }
}

function buildViewHref(
  view: string,
  q: string,
  status: string,
  assigned: string
) {
  const params = new URLSearchParams();
  if (view && view !== "all") params.set("view", view);
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (assigned) params.set("assigned", assigned);
  const query = params.toString();
  return query ? `/crm/leads?${query}` : "/crm/leads";
}

function matchesView(lead: LeadRow, view: string, todayStart: Date, todayEnd: Date) {
  const followUp = parseDate(lead.next_follow_up_at);

  switch (view) {
    case "followups_today":
      return (
        !isClosedStatus(lead.status) &&
        !!followUp &&
        followUp >= todayStart &&
        followUp <= todayEnd
      );
    case "overdue":
      return !isClosedStatus(lead.status) && !!followUp && followUp < todayStart;
    case "unassigned":
      return !isClosedStatus(lead.status) && !lead.assigned_to;
    case "new":
      return !isClosedStatus(lead.status) && lead.status === "new_lead";
    case "consult_scheduled":
      return !isClosedStatus(lead.status) && lead.status === "consult_scheduled";
    case "treatment_plan":
      return (
        !isClosedStatus(lead.status) &&
        (lead.status === "treatment_plan_presented" ||
          lead.status === "followup_needed")
      );
    case "converted":
      return lead.status === "converted";
    case "lost":
      return lead.status === "lost";
    case "all":
    default:
      return true;
  }
}

async function quickLeadAction(formData: FormData) {
  "use server";

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("clinic_id, full_name")
    .eq("id", user.id)
    .single<{ clinic_id: string | null; full_name: string | null }>();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const clinicId = profile?.clinic_id ?? null;
  if (!clinicId) {
    throw new Error("Missing clinic access.");
  }

  const leadId = String(formData.get("lead_id") ?? "").trim();
  const action = String(formData.get("quick_action") ?? "").trim();
  const returnTo = String(formData.get("return_to") ?? "/crm/leads").trim() || "/crm/leads";

  if (!leadId) {
    throw new Error("Missing lead id.");
  }

  const { data: existingLead, error: existingLeadError } = await supabase
    .from("leads")
    .select("id, clinic_id, status, assigned_to, next_follow_up_at")
    .eq("id", leadId)
    .eq("clinic_id", clinicId)
    .single<{
      id: string;
      clinic_id: string;
      status: LeadStatus;
      assigned_to: string | null;
      next_follow_up_at: string | null;
    }>();

  if (existingLeadError || !existingLead) {
    throw new Error("Lead not found or not accessible.");
  }

  const now = new Date();
  const tomorrow = addDays(now, 1);
  const nextWeek = addDays(now, 7);

  let updates: Record<string, unknown> = {
    updated_at: now.toISOString(),
  };

  let activityType = "note";
  let activityBody = "";

  switch (action) {
    case "mark_contacted":
      updates = {
        ...updates,
        status: "contacted",
        last_contacted_at: now.toISOString(),
      };
      activityType = "status_change";
      activityBody = "Quick action: marked as Contacted.";
      break;

    case "followup_tomorrow":
      updates = {
        ...updates,
        status:
          existingLead.status === "new_lead" ? "followup_needed" : existingLead.status,
        next_follow_up_at: tomorrow.toISOString(),
      };
      activityType = "follow_up";
      activityBody = `Quick action: follow-up scheduled for ${tomorrow.toLocaleString()}.`;
      break;

    case "followup_next_week":
      updates = {
        ...updates,
        status:
          existingLead.status === "new_lead" ? "followup_needed" : existingLead.status,
        next_follow_up_at: nextWeek.toISOString(),
      };
      activityType = "follow_up";
      activityBody = `Quick action: follow-up scheduled for ${nextWeek.toLocaleString()}.`;
      break;

    case "mark_followup_needed":
      updates = {
        ...updates,
        status: "followup_needed",
      };
      activityType = "status_change";
      activityBody = "Quick action: marked as Follow-up Needed.";
      break;

    case "unassign":
      updates = {
        ...updates,
        assigned_to: null,
      };
      activityType = "note";
      activityBody = "Quick action: lead unassigned.";
      break;

    default:
      throw new Error("Invalid quick action.");
  }

  const { data: updatedRows, error: updateError } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", leadId)
    .eq("clinic_id", clinicId)
    .select("id");

  if (updateError) {
    throw new Error(`Quick action failed: ${updateError.message}`);
  }

  if (!updatedRows || updatedRows.length === 0) {
    throw new Error("No lead was updated.");
  }

  const { error: activityError } = await supabase.from("lead_activities").insert({
    clinic_id: clinicId,
    lead_id: leadId,
    activity_type: activityType,
    body: activityBody,
    created_by: user.id,
  });

  if (activityError) {
    console.error("Activity log failed:", activityError.message);
  }

  revalidatePath("/crm");
  revalidatePath("/crm/leads");
  revalidatePath(`/crm/leads/${leadId}`);
  redirect(returnTo);
}

export default async function CRMLeadsPage(props: PageProps) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const view = getParam(searchParams?.view, "all");
  const q = getParam(searchParams?.q).trim().toLowerCase();
  const statusFilter = getParam(searchParams?.status).trim();
  const assignedFilter = getParam(searchParams?.assigned).trim();

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("id, full_name, clinic_id, role")
    .eq("id", user.id)
    .single<ProfileRow>();

  const myClinicId = myProfile?.clinic_id ?? null;

  if (!myClinicId) {
    redirect("/dashboard");
  }

  const { data: staffData, error: staffError } = await supabase
    .from("profiles")
    .select("id, full_name, clinic_id, role")
    .eq("clinic_id", myClinicId)
    .order("full_name", { ascending: true });

  if (staffError) {
    throw new Error(staffError.message);
  }

  const { data: leadsData, error: leadsError } = await supabase
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
    .eq("clinic_id", myClinicId)
    .order("created_at", { ascending: false });

  if (leadsError) {
    throw new Error(leadsError.message);
  }

  const staff = (staffData ?? []) as ProfileRow[];
  const leads = (leadsData ?? []) as LeadRow[];

  const staffMap = new Map<string, string>();
  for (const person of staff) {
    staffMap.set(person.id, person.full_name || person.role || person.id);
  }

  const todayStart = startOfTodayLocal();
  const todayEnd = endOfTodayLocal();

  const filtered = leads
    .filter((lead) => matchesView(lead, view, todayStart, todayEnd))
    .filter((lead) => {
      if (!statusFilter) return true;
      return String(lead.status ?? "") === statusFilter;
    })
    .filter((lead) => {
      if (!assignedFilter) return true;
      if (assignedFilter === "unassigned") return !lead.assigned_to;
      return String(lead.assigned_to ?? "") === assignedFilter;
    })
    .filter((lead) => {
      if (!q) return true;

      const haystack = [
        lead.full_name,
        lead.phone,
        lead.email,
        lead.source,
        lead.treatment_interest,
        lead.notes,
        getStatusLabel(lead.status),
      ]
        .map((v) => String(v ?? "").toLowerCase())
        .join(" ");

      return haystack.includes(q);
    })
    .sort((a, b) => {
      const aFollow = parseDate(a.next_follow_up_at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bFollow = parseDate(b.next_follow_up_at)?.getTime() ?? Number.MAX_SAFE_INTEGER;

      if (view === "overdue" || view === "followups_today") {
        if (aFollow !== bFollow) return aFollow - bFollow;
      }

      const aCreated = parseDate(a.created_at)?.getTime() ?? 0;
      const bCreated = parseDate(b.created_at)?.getTime() ?? 0;
      return bCreated - aCreated;
    });

  const counts = {
    all: leads.length,
    followUpsToday: leads.filter((lead) => {
      const d = parseDate(lead.next_follow_up_at);
      return !isClosedStatus(lead.status) && !!d && d >= todayStart && d <= todayEnd;
    }).length,
    overdue: leads.filter((lead) => {
      const d = parseDate(lead.next_follow_up_at);
      return !isClosedStatus(lead.status) && !!d && d < todayStart;
    }).length,
    unassigned: leads.filter(
      (lead) => !isClosedStatus(lead.status) && !lead.assigned_to
    ).length,
    newLeads: leads.filter(
      (lead) => !isClosedStatus(lead.status) && lead.status === "new_lead"
    ).length,
    consultScheduled: leads.filter(
      (lead) => !isClosedStatus(lead.status) && lead.status === "consult_scheduled"
    ).length,
    treatmentPlan: leads.filter(
      (lead) =>
        !isClosedStatus(lead.status) &&
        (lead.status === "treatment_plan_presented" ||
          lead.status === "followup_needed")
    ).length,
    converted: leads.filter((lead) => lead.status === "converted").length,
    lost: leads.filter((lead) => lead.status === "lost").length,
  };

  const currentPath = buildViewHref(view, getParam(searchParams?.q), statusFilter, assignedFilter);

  const pageStyle: CSSProperties = { minHeight: "100vh", background: "#f8fafc", padding: 16 };
  const wrapStyle: CSSProperties = { width: "100%", maxWidth: 1280, margin: "0 auto", display: "grid", gap: 18 };
  const cardStyle: CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 24, padding: 22, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" };
  const headerTitleStyle: CSSProperties = { margin: 0, fontSize: 34, fontWeight: 900, color: "#0f172a" };
  const descStyle: CSSProperties = { margin: "10px 0 0 0", color: "#64748b", fontSize: 15, lineHeight: 1.6 };
  const topActionsStyle: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 12, marginTop: 18 };
  const primaryLinkStyle: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", borderRadius: 14, background: "#0f172a", color: "#fff", padding: "12px 18px", fontSize: 15, fontWeight: 800 };
  const secondaryLinkStyle: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", borderRadius: 14, background: "#fff", color: "#0f172a", border: "1px solid #cbd5e1", padding: "12px 18px", fontSize: 15, fontWeight: 800 };
  const filtersGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 };
  const fieldStyle: CSSProperties = { display: "grid", gap: 8 };
  const labelStyle: CSSProperties = { fontSize: 13, fontWeight: 800, color: "#0f172a" };
  const inputStyle: CSSProperties = { width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, border: "1px solid #cbd5e1", background: "#fff", fontSize: 15, color: "#0f172a" };
  const formActionsStyle: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 };
  const tabsWrapStyle: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 10 };
  const listStyle: CSSProperties = { display: "grid", gap: 14 };
  const rowCardStyle: CSSProperties = { border: "1px solid #e2e8f0", borderRadius: 20, padding: 18, background: "#fff" };
  const rowHeaderStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" };
  const nameStyle: CSSProperties = { margin: 0, fontSize: 22, fontWeight: 900, color: "#0f172a" };
  const metaStyle: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" };
  const infoGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 14 };
  const infoBoxStyle: CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "10px 12px" };
  const infoLabelStyle: CSSProperties = { fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.35, marginBottom: 5 };
  const infoValueStyle: CSSProperties = { fontSize: 14, fontWeight: 700, color: "#0f172a", wordBreak: "break-word" };
  const smallTextStyle: CSSProperties = { color: "#64748b", fontSize: 14, lineHeight: 1.6 };
  const rowActionsStyle: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 };
  const pillButtonStyle: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", borderRadius: 12, background: "#fff", color: "#0f172a", border: "1px solid #cbd5e1", padding: "10px 12px", fontSize: 14, fontWeight: 800 };
  const quickBtnStyle: CSSProperties = { appearance: "none", border: "1px solid #cbd5e1", borderRadius: 12, background: "#fff", color: "#0f172a", padding: "10px 12px", fontSize: 13, fontWeight: 800, cursor: "pointer" };
  const emptyStyle: CSSProperties = { border: "1px dashed #cbd5e1", borderRadius: 18, padding: 18, color: "#64748b", background: "#fff", fontSize: 15 };
  const sectionHeaderStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 };
  const sectionTitleStyle: CSSProperties = { margin: 0, fontSize: 22, fontWeight: 900, color: "#0f172a" };
  const activeTabStyle = (active: boolean): CSSProperties => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", borderRadius: 999, padding: "10px 14px", fontSize: 14, fontWeight: 800, border: active ? "1px solid #0f172a" : "1px solid #cbd5e1", background: active ? "#0f172a" : "#fff", color: active ? "#fff" : "#0f172a" });

  return (
    <div style={pageStyle}>
      <div style={wrapStyle}>
        <section style={cardStyle}>
          <h1 style={headerTitleStyle}>CRM Workspace</h1>
          <p style={descStyle}>
            This is the main lead management workspace. Search, filter, and open
            leads here. Use the dashboard for priority, and use this page for the
            actual daily follow-up work.
          </p>
          <div style={topActionsStyle}>
            <Link href="/crm" style={secondaryLinkStyle}>← Back to Dashboard</Link>
            <Link href="/crm/leads/new" style={primaryLinkStyle}>+ New Lead</Link>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Quick Views</h2>
              <p style={{ ...descStyle, marginTop: 6, fontSize: 14 }}>
                Open the list that matches what your team needs to work on right now.
              </p>
            </div>
          </div>
          <div style={tabsWrapStyle}>
            <Link href={buildViewHref("all", q, statusFilter, assignedFilter)} style={activeTabStyle(view === "all")}>All ({counts.all})</Link>
            <Link href={buildViewHref("followups_today", q, statusFilter, assignedFilter)} style={activeTabStyle(view === "followups_today")}>Follow-ups Today ({counts.followUpsToday})</Link>
            <Link href={buildViewHref("overdue", q, statusFilter, assignedFilter)} style={activeTabStyle(view === "overdue")}>Overdue ({counts.overdue})</Link>
            <Link href={buildViewHref("unassigned", q, statusFilter, assignedFilter)} style={activeTabStyle(view === "unassigned")}>Unassigned ({counts.unassigned})</Link>
            <Link href={buildViewHref("new", q, statusFilter, assignedFilter)} style={activeTabStyle(view === "new")}>New Leads ({counts.newLeads})</Link>
            <Link href={buildViewHref("consult_scheduled", q, statusFilter, assignedFilter)} style={activeTabStyle(view === "consult_scheduled")}>Consult Scheduled ({counts.consultScheduled})</Link>
            <Link href={buildViewHref("treatment_plan", q, statusFilter, assignedFilter)} style={activeTabStyle(view === "treatment_plan")}>Treatment Plan ({counts.treatmentPlan})</Link>
            <Link href={buildViewHref("converted", q, statusFilter, assignedFilter)} style={activeTabStyle(view === "converted")}>Converted ({counts.converted})</Link>
            <Link href={buildViewHref("lost", q, statusFilter, assignedFilter)} style={activeTabStyle(view === "lost")}>Lost ({counts.lost})</Link>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Search & Filters</h2>
              <p style={{ ...descStyle, marginTop: 6, fontSize: 14 }}>
                Narrow the lead list by text, status, or staff assignment.
              </p>
            </div>
          </div>
          <form method="get">
            <input type="hidden" name="view" value={view} />
            <div style={filtersGridStyle}>
              <div style={fieldStyle}>
                <label htmlFor="q" style={labelStyle}>Search</label>
                <input id="q" name="q" defaultValue={getParam(searchParams?.q)} placeholder="Name, phone, email, source..." style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label htmlFor="status" style={labelStyle}>Status</label>
                <select id="status" name="status" defaultValue={statusFilter} style={inputStyle}>
                  <option value="">All statuses</option>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div style={fieldStyle}>
                <label htmlFor="assigned" style={labelStyle}>Assigned To</label>
                <select id="assigned" name="assigned" defaultValue={assignedFilter} style={inputStyle}>
                  <option value="">All staff</option>
                  <option value="unassigned">Unassigned</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>{member.full_name || member.role || member.id}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={formActionsStyle}>
              <button type="submit" style={primaryLinkStyle}>Apply Filters</button>
              <Link href={view === "all" ? "/crm/leads" : `/crm/leads?view=${view}`} style={secondaryLinkStyle}>Reset Filters</Link>
            </div>
          </form>
        </section>

        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Lead List</h2>
              <p style={{ ...descStyle, marginTop: 6, fontSize: 14 }}>
                {filtered.length} result{filtered.length === 1 ? "" : "s"} found.
              </p>
            </div>
          </div>

          <div style={listStyle}>
            {filtered.length === 0 ? (
              <div style={emptyStyle}>No leads match the current filters.</div>
            ) : (
              filtered.map((lead) => {
                const followUp = parseDate(lead.next_follow_up_at);
                const isOverdue = !isClosedStatus(lead.status) && !!followUp && followUp < todayStart;
                const isToday = !isClosedStatus(lead.status) && !!followUp && followUp >= todayStart && followUp <= todayEnd;
                const assignedName = lead.assigned_to ? staffMap.get(lead.assigned_to) || lead.assigned_to : "Unassigned";

                return (
                  <div key={lead.id} style={rowCardStyle}>
                    <div style={rowHeaderStyle}>
                      <div>
                        <h3 style={nameStyle}>{lead.full_name || "Unnamed Lead"}</h3>
                        <div style={metaStyle}>
                          <span style={getStatusTone(lead.status)}>{getStatusLabel(lead.status)}</span>
                          {isOverdue ? <span style={{ ...getStatusTone("followup_needed"), background: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" }}>Overdue</span> : null}
                          {isToday ? <span style={{ ...getStatusTone("contacted"), background: "#ecfeff", color: "#155e75", borderColor: "#a5f3fc" }}>Follow-up Today</span> : null}
                          {!lead.assigned_to && !isClosedStatus(lead.status) ? <span style={{ ...getStatusTone("inactive"), background: "#fff7ed", color: "#9a3412", borderColor: "#fdba74" }}>Unassigned</span> : null}
                          {lead.is_active === false ? <span style={getStatusTone("inactive")}>Inactive</span> : null}
                        </div>
                      </div>
                    </div>

                    <div style={infoGridStyle}>
                      <div style={infoBoxStyle}><div style={infoLabelStyle}>Phone</div><div style={infoValueStyle}>{lead.phone || "-"}</div></div>
                      <div style={infoBoxStyle}><div style={infoLabelStyle}>Email</div><div style={infoValueStyle}>{lead.email || "-"}</div></div>
                      <div style={infoBoxStyle}><div style={infoLabelStyle}>Interest</div><div style={infoValueStyle}>{lead.treatment_interest || "-"}</div></div>
                      <div style={infoBoxStyle}><div style={infoLabelStyle}>Assigned To</div><div style={infoValueStyle}>{assignedName}</div></div>
                      <div style={infoBoxStyle}><div style={infoLabelStyle}>Last Contacted</div><div style={infoValueStyle}>{formatDateTime(lead.last_contacted_at)}</div></div>
                      <div style={infoBoxStyle}><div style={infoLabelStyle}>Next Follow-up</div><div style={infoValueStyle}>{formatDateTime(lead.next_follow_up_at)}</div></div>
                      <div style={infoBoxStyle}><div style={infoLabelStyle}>Source</div><div style={infoValueStyle}>{lead.source || "-"}</div></div>
                      <div style={infoBoxStyle}><div style={infoLabelStyle}>Created</div><div style={infoValueStyle}>{formatShortDate(lead.created_at)}</div></div>
                    </div>

                    {lead.notes ? <div style={{ ...smallTextStyle, marginTop: 12 }}>Notes: {lead.notes}</div> : null}

                    <div style={rowActionsStyle}>
                      <Link href={`/crm/leads/${lead.id}`} style={pillButtonStyle}>Open</Link>

                      {/* ↓ 변경된 부분: Call + Text 버튼 */}
                      {lead.phone ? (
                        <>
                          <a href={`tel:${lead.phone}`} style={pillButtonStyle}>
                            📞 Call
                          </a>
                          <TextButton phone={lead.phone} />
                        </>
                      ) : null}

                      {!isClosedStatus(lead.status) ? (
                        <>
                          <form action={quickLeadAction}>
                            <input type="hidden" name="lead_id" value={lead.id} />
                            <input type="hidden" name="quick_action" value="mark_contacted" />
                            <input type="hidden" name="return_to" value={currentPath} />
                            <button type="submit" style={quickBtnStyle}>Mark Contacted</button>
                          </form>
                          <form action={quickLeadAction}>
                            <input type="hidden" name="lead_id" value={lead.id} />
                            <input type="hidden" name="quick_action" value="followup_tomorrow" />
                            <input type="hidden" name="return_to" value={currentPath} />
                            <button type="submit" style={quickBtnStyle}>Follow-up Tomorrow</button>
                          </form>
                          <form action={quickLeadAction}>
                            <input type="hidden" name="lead_id" value={lead.id} />
                            <input type="hidden" name="quick_action" value="followup_next_week" />
                            <input type="hidden" name="return_to" value={currentPath} />
                            <button type="submit" style={quickBtnStyle}>Follow-up Next Week</button>
                          </form>
                          <form action={quickLeadAction}>
                            <input type="hidden" name="lead_id" value={lead.id} />
                            <input type="hidden" name="quick_action" value="mark_followup_needed" />
                            <input type="hidden" name="return_to" value={currentPath} />
                            <button type="submit" style={quickBtnStyle}>Mark Follow-up Needed</button>
                          </form>
                          {lead.assigned_to ? (
                            <form action={quickLeadAction}>
                              <input type="hidden" name="lead_id" value={lead.id} />
                              <input type="hidden" name="quick_action" value="unassign" />
                              <input type="hidden" name="return_to" value={currentPath} />
                              <button type="submit" style={quickBtnStyle}>Unassign</button>
                            </form>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}