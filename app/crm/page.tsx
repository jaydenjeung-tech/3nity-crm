import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type LeadStatus =
  | "new_lead"
  | "attempted_contact"
  | "contacted"
  | "consult_scheduled"
  | "consult_completed"
  | "treatment_plan_presented"
  | "followup_needed"
  | "accepted"
  | "converted"
  | "lost"
  | "inactive"
  | string
  | null;

type LeadRow = {
  id: string;
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
};

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

function parseDate(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
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
  switch (status) {
    case "new_lead":
      return "New Lead";
    case "attempted_contact":
      return "Attempted Contact";
    case "contacted":
      return "Contacted";
    case "consult_scheduled":
      return "Consult Scheduled";
    case "consult_completed":
      return "Consult Completed";
    case "treatment_plan_presented":
      return "Treatment Plan Presented";
    case "followup_needed":
      return "Follow-up Needed";
    case "accepted":
      return "Accepted";
    case "converted":
      return "Converted";
    case "lost":
      return "Lost";
    case "inactive":
      return "Inactive";
    default:
      return status ? String(status) : "-";
  }
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

function byNewest(a: LeadRow, b: LeadRow) {
  const ad = parseDate(a.created_at)?.getTime() ?? 0;
  const bd = parseDate(b.created_at)?.getTime() ?? 0;
  return bd - ad;
}

function byUpcomingFollowUp(a: LeadRow, b: LeadRow) {
  const ad = parseDate(a.next_follow_up_at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const bd = parseDate(b.next_follow_up_at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return ad - bd;
}

function byConsultDate(a: LeadRow, b: LeadRow) {
  const ad = parseDate(a.next_follow_up_at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const bd = parseDate(b.next_follow_up_at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return ad - bd;
}

function getPriorityRank(lead: LeadRow, todayStart: Date, todayEnd: Date) {
  if (isClosedStatus(lead.status)) return 999;

  const followUp = parseDate(lead.next_follow_up_at);

  if (followUp && followUp < todayStart) return 1; // overdue
  if (followUp && followUp >= todayStart && followUp <= todayEnd) return 2; // today
  if (!lead.assigned_to) return 3; // unassigned
  if (lead.status === "new_lead") return 4;
  if (lead.status === "treatment_plan_presented" || lead.status === "followup_needed")
    return 5;

  return 50;
}

export default async function CRMPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("id, full_name, clinic_id")
    .eq("id", user.id)
    .single<ProfileRow>();

  const myClinicId = myProfile?.clinic_id ?? null;

  if (!myClinicId) {
    redirect("/dashboard");
  }

  const { data: leadsData, error: leadsError } = await supabase
    .from("leads")
    .select(
      `
      id,
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
    `
    )
    .eq("clinic_id", myClinicId)
    .order("created_at", { ascending: false });

  if (leadsError) {
    throw new Error(leadsError.message);
  }

  const leads = (leadsData ?? []) as LeadRow[];

  const todayStart = startOfTodayLocal();
  const todayEnd = endOfTodayLocal();
  const weekEnd = addDays(todayEnd, 7);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

  const activeLeads = leads.filter((lead) => lead.is_active !== false);
  const openLeads = activeLeads.filter((lead) => !isClosedStatus(lead.status));

  const followUpsToday = openLeads.filter((lead) => {
    const d = parseDate(lead.next_follow_up_at);
    return !!d && d >= todayStart && d <= todayEnd;
  });

  const overdueLeads = openLeads.filter((lead) => {
    const d = parseDate(lead.next_follow_up_at);
    return !!d && d < todayStart;
  });

  const unassignedLeads = openLeads.filter((lead) => !lead.assigned_to);

  const newLeadsToday = openLeads.filter((lead) => {
    const d = parseDate(lead.created_at);
    return !!d && d >= todayStart && d <= todayEnd;
  });

  const consultsThisWeek = openLeads.filter((lead) => {
    const d = parseDate(lead.next_follow_up_at);
    return (
      lead.status === "consult_scheduled" &&
      !!d &&
      d >= todayStart &&
      d <= weekEnd
    );
  });

  const convertedThisMonth = leads.filter((lead) => {
    const d = parseDate(lead.updated_at);
    return lead.status === "converted" && !!d && d >= monthStart;
  });

  const needsAttention = [...openLeads]
    .sort((a, b) => {
      const pa = getPriorityRank(a, todayStart, todayEnd);
      const pb = getPriorityRank(b, todayStart, todayEnd);
      if (pa !== pb) return pa - pb;

      const af = parseDate(a.next_follow_up_at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bf = parseDate(b.next_follow_up_at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (af !== bf) return af - bf;

      return byNewest(a, b);
    })
    .filter((lead) => getPriorityRank(lead, todayStart, todayEnd) < 50)
    .slice(0, 8);

  const recentNewLeads = [...openLeads].sort(byNewest).slice(0, 6);

  const thisWeeksConsults = [...consultsThisWeek].sort(byConsultDate).slice(0, 6);

  const containerStyle: CSSProperties = {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: 16,
  };

  const wrapStyle: CSSProperties = {
    width: "100%",
    maxWidth: 1280,
    margin: "0 auto",
    display: "grid",
    gap: 18,
  };

  const cardStyle: CSSProperties = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 24,
    padding: 22,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  };

  const titleStyle: CSSProperties = {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    color: "#0f172a",
  };

  const descStyle: CSSProperties = {
    margin: "10px 0 0 0",
    color: "#64748b",
    fontSize: 16,
    lineHeight: 1.55,
  };

  const actionRowStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 18,
  };

  const primaryLinkStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    borderRadius: 14,
    background: "#0f172a",
    color: "#fff",
    padding: "12px 18px",
    fontSize: 15,
    fontWeight: 800,
  };

  const secondaryLinkStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    borderRadius: 14,
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    padding: "12px 18px",
    fontSize: 15,
    fontWeight: 800,
  };

  const kpiGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
  };

  const kpiCardStyle: CSSProperties = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 20,
    padding: 20,
  };

  const kpiLabelStyle: CSSProperties = {
    fontSize: 14,
    color: "#64748b",
    fontWeight: 700,
    marginBottom: 10,
  };

  const kpiValueStyle: CSSProperties = {
    fontSize: 42,
    lineHeight: 1,
    fontWeight: 900,
    color: "#0f172a",
  };

  const sectionHeaderStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 16,
  };

  const sectionTitleStyle: CSSProperties = {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: "#0f172a",
  };

  const twoColStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 1fr)",
    gap: 18,
  };

  const listStyle: CSSProperties = {
    display: "grid",
    gap: 12,
  };

  const rowCardStyle: CSSProperties = {
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    padding: 16,
    background: "#fff",
  };

  const nameStyle: CSSProperties = {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: "#0f172a",
  };

  const metaStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    alignItems: "center",
  };

  const smallTextStyle: CSSProperties = {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.5,
  };

  const infoGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
    marginTop: 14,
  };

  const infoBoxStyle: CSSProperties = {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: "10px 12px",
  };

  const infoLabelStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.35,
    marginBottom: 5,
  };

  const infoValueStyle: CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    wordBreak: "break-word",
  };

  const rowActionsStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  };

  const pillButtonStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    borderRadius: 12,
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    padding: "10px 12px",
    fontSize: 14,
    fontWeight: 800,
  };

  const emptyStyle: CSSProperties = {
    border: "1px dashed #cbd5e1",
    borderRadius: 18,
    padding: 18,
    color: "#64748b",
    background: "#fff",
    fontSize: 15,
  };

  return (
    <div style={containerStyle}>
      <div style={wrapStyle}>
        <section style={cardStyle}>
          <h1 style={{ ...titleStyle, fontSize: 36 }}>CRM Dashboard</h1>
          <p style={descStyle}>
            Welcome back, {myProfile?.full_name || "Team Member"}. Use this page to
            identify urgent follow-ups, overdue leads, and this week’s consults
            before jumping into the full CRM workspace.
          </p>

          <div style={actionRowStyle}>
            <Link href="/crm/leads/new" style={primaryLinkStyle}>
              + New Lead
            </Link>
            <Link href="/crm/leads" style={secondaryLinkStyle}>
              Open CRM Workspace
            </Link>
            <Link href="/crm/leads?view=followups_today" style={secondaryLinkStyle}>
              Follow-ups Today
            </Link>
            <Link href="/crm/leads?view=overdue" style={secondaryLinkStyle}>
              Overdue Leads
            </Link>
            <Link href="/crm/leads?view=unassigned" style={secondaryLinkStyle}>
              Unassigned Leads
            </Link>
          </div>
        </section>

        <section style={kpiGridStyle}>
          <div style={kpiCardStyle}>
            <div style={kpiLabelStyle}>Follow-ups Today</div>
            <div style={kpiValueStyle}>{followUpsToday.length}</div>
          </div>

          <div style={kpiCardStyle}>
            <div style={kpiLabelStyle}>Overdue</div>
            <div style={kpiValueStyle}>{overdueLeads.length}</div>
          </div>

          <div style={kpiCardStyle}>
            <div style={kpiLabelStyle}>Unassigned</div>
            <div style={kpiValueStyle}>{unassignedLeads.length}</div>
          </div>

          <div style={kpiCardStyle}>
            <div style={kpiLabelStyle}>New Leads Today</div>
            <div style={kpiValueStyle}>{newLeadsToday.length}</div>
          </div>

          <div style={kpiCardStyle}>
            <div style={kpiLabelStyle}>Consults This Week</div>
            <div style={kpiValueStyle}>{consultsThisWeek.length}</div>
          </div>

          <div style={kpiCardStyle}>
            <div style={kpiLabelStyle}>Converted This Month</div>
            <div style={kpiValueStyle}>{convertedThisMonth.length}</div>
          </div>
        </section>

        <section style={twoColStyle}>
          <div style={cardStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>Needs Attention</h2>
                <p style={{ ...descStyle, marginTop: 6, fontSize: 14 }}>
                  Overdue first, then today’s follow-ups, then unassigned and fresh leads.
                </p>
              </div>
              <Link href="/crm/leads" style={secondaryLinkStyle}>
                View CRM
              </Link>
            </div>

            <div style={listStyle}>
              {needsAttention.length === 0 ? (
                <div style={emptyStyle}>No urgent leads right now.</div>
              ) : (
                needsAttention.map((lead) => {
                  const followUpDate = parseDate(lead.next_follow_up_at);
                  const isOverdue = !!followUpDate && followUpDate < todayStart;
                  const isToday =
                    !!followUpDate &&
                    followUpDate >= todayStart &&
                    followUpDate <= todayEnd;

                  return (
                    <div key={lead.id} style={rowCardStyle}>
                      <h3 style={nameStyle}>{lead.full_name || "Unnamed Lead"}</h3>

                      <div style={metaStyle}>
                        <span style={getStatusTone(lead.status)}>
                          {getStatusLabel(lead.status)}
                        </span>

                        {isOverdue ? (
                          <span
                            style={{
                              ...getStatusTone("followup_needed"),
                              background: "#fef2f2",
                              color: "#b91c1c",
                              borderColor: "#fecaca",
                            }}
                          >
                            Overdue
                          </span>
                        ) : null}

                        {isToday ? (
                          <span
                            style={{
                              ...getStatusTone("contacted"),
                              background: "#ecfeff",
                              color: "#155e75",
                              borderColor: "#a5f3fc",
                            }}
                          >
                            Today
                          </span>
                        ) : null}

                        {!lead.assigned_to ? (
                          <span
                            style={{
                              ...getStatusTone("inactive"),
                              background: "#fff7ed",
                              color: "#9a3412",
                              borderColor: "#fdba74",
                            }}
                          >
                            Unassigned
                          </span>
                        ) : null}
                      </div>

                      <div style={infoGridStyle}>
                        <div style={infoBoxStyle}>
                          <div style={infoLabelStyle}>Phone</div>
                          <div style={infoValueStyle}>{lead.phone || "-"}</div>
                        </div>

                        <div style={infoBoxStyle}>
                          <div style={infoLabelStyle}>Interest</div>
                          <div style={infoValueStyle}>
                            {lead.treatment_interest || "-"}
                          </div>
                        </div>

                        <div style={infoBoxStyle}>
                          <div style={infoLabelStyle}>Next Follow-up</div>
                          <div style={infoValueStyle}>
                            {formatDateTime(lead.next_follow_up_at)}
                          </div>
                        </div>

                        <div style={infoBoxStyle}>
                          <div style={infoLabelStyle}>Source</div>
                          <div style={infoValueStyle}>{lead.source || "-"}</div>
                        </div>
                      </div>

                      <div style={rowActionsStyle}>
                        <Link href={`/crm/leads/${lead.id}`} style={pillButtonStyle}>
                          Open
                        </Link>
                        {lead.phone ? (
                          <a href={`tel:${lead.phone}`} style={pillButtonStyle}>
                            Call
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            <div style={cardStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <h2 style={sectionTitleStyle}>This Week’s Consults</h2>
                  <p style={{ ...descStyle, marginTop: 6, fontSize: 14 }}>
                    Leads currently in consult scheduled status.
                  </p>
                </div>
                <Link
                  href="/crm/leads?view=consult_scheduled"
                  style={secondaryLinkStyle}
                >
                  View All
                </Link>
              </div>

              <div style={listStyle}>
                {thisWeeksConsults.length === 0 ? (
                  <div style={emptyStyle}>No consults scheduled this week.</div>
                ) : (
                  thisWeeksConsults.map((lead) => (
                    <div key={lead.id} style={rowCardStyle}>
                      <h3 style={{ ...nameStyle, fontSize: 18 }}>
                        {lead.full_name || "Unnamed Lead"}
                      </h3>
                      <div style={metaStyle}>
                        <span style={getStatusTone(lead.status)}>
                          {getStatusLabel(lead.status)}
                        </span>
                      </div>
                      <div style={{ ...smallTextStyle, marginTop: 10 }}>
                        Consult date: {formatDateTime(lead.next_follow_up_at)}
                      </div>
                      <div style={{ ...smallTextStyle, marginTop: 6 }}>
                        Phone: {lead.phone || "-"}
                      </div>
                      <div style={rowActionsStyle}>
                        <Link href={`/crm/leads/${lead.id}`} style={pillButtonStyle}>
                          Open
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <h2 style={sectionTitleStyle}>Recent New Leads</h2>
                  <p style={{ ...descStyle, marginTop: 6, fontSize: 14 }}>
                    Most recently created active leads.
                  </p>
                </div>
                <Link href="/crm/leads?view=new" style={secondaryLinkStyle}>
                  View All
                </Link>
              </div>

              <div style={listStyle}>
                {recentNewLeads.length === 0 ? (
                  <div style={emptyStyle}>No recent leads yet.</div>
                ) : (
                  recentNewLeads.map((lead) => (
                    <div key={lead.id} style={rowCardStyle}>
                      <h3 style={{ ...nameStyle, fontSize: 18 }}>
                        {lead.full_name || "Unnamed Lead"}
                      </h3>
                      <div style={metaStyle}>
                        <span style={getStatusTone(lead.status)}>
                          {getStatusLabel(lead.status)}
                        </span>
                      </div>
                      <div style={{ ...smallTextStyle, marginTop: 10 }}>
                        Created: {formatShortDate(lead.created_at)}
                      </div>
                      <div style={{ ...smallTextStyle, marginTop: 6 }}>
                        Source: {lead.source || "-"} · Interest:{" "}
                        {lead.treatment_interest || "-"}
                      </div>
                      <div style={rowActionsStyle}>
                        <Link href={`/crm/leads/${lead.id}`} style={pillButtonStyle}>
                          Open
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}