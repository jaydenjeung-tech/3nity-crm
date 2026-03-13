import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type LeadRow = {
  id: string;
  full_name: string | null;
  status: string | null;
  created_at: string | null;
};

type TaskRow = {
  id: string;
  lead_id: string | null;
  title: string | null;
  status: string | null;
  priority: string | null;
  due_at: string | null;
};

type ProfileRow = {
  id: string;
  role: string | null;
  full_name: string | null;
};

type StatCardProps = {
  label: string;
  value: number;
};

function normalizeStatus(value: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function startOfTodayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function endOfTodayLocal() {
  const start = startOfTodayLocal();
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
}

function toUtcIso(d: Date) {
  return d.toISOString();
}

function pageShellStyle(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background: "#f6f7fb",
    padding: "20px 16px 40px",
  };
}

function containerStyle(): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: 1150,
    margin: "0 auto",
    display: "grid",
    gap: 20,
  };
}

function panelStyle(): React.CSSProperties {
  return {
    background: "#ffffff",
    border: "1px solid #d9e0ea",
    borderRadius: 24,
    padding: 24,
    boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
  };
}

function titleStyle(): React.CSSProperties {
  return {
    margin: 0,
    fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
    lineHeight: 1.1,
    fontWeight: 900,
    letterSpacing: "-0.03em",
    color: "#0b1f44",
  };
}

function descStyle(): React.CSSProperties {
  return {
    margin: "10px 0 0",
    fontSize: 16,
    lineHeight: 1.7,
    color: "#5d728f",
  };
}

function navWrapStyle(): React.CSSProperties {
  return {
    display: "flex",
    gap: 12,
    overflowX: "auto",
    paddingBottom: 4,
    flexWrap: "nowrap",
  };
}

function navButtonStyle(active = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    minHeight: 46,
    padding: "0 18px",
    borderRadius: 16,
    border: `1px solid ${active ? "#0b1f44" : "#cfd8e3"}`,
    background: active ? "#0b1f44" : "#ffffff",
    color: active ? "#ffffff" : "#0b1f44",
    textDecoration: "none",
    fontSize: 15,
    fontWeight: 800,
  };
}

function statGridStyle(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
  };
}

function statCardStyle(): React.CSSProperties {
  return {
    border: "1px solid #d9e0ea",
    borderRadius: 20,
    background: "#ffffff",
    padding: 20,
    minHeight: 128,
  };
}

function listCardStyle(isWarning = false): React.CSSProperties {
  return {
    display: "block",
    textDecoration: "none",
    border: `1px solid ${isWarning ? "#f0c8cf" : "#d9e0ea"}`,
    background: isWarning ? "#fff7f8" : "#ffffff",
    borderRadius: 18,
    padding: 18,
    color: "inherit",
  };
}

function miniButtonStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 40,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid #cfd8e3",
    background: "#ffffff",
    color: "#0b1f44",
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 14,
  };
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h2
        style={{
          margin: 0,
          fontSize: 24,
          fontWeight: 900,
          color: "#0b1f44",
        }}
      >
        {title}
      </h2>
      {description ? <p style={descStyle()}>{description}</p> : null}
    </div>
  );
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div style={statCardStyle()}>
      <div
        style={{
          fontSize: 16,
          color: "#5d728f",
          marginBottom: 18,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 42,
          fontWeight: 900,
          color: "#0b1f44",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  const { data: leadsData } = await supabase
    .from("leads")
    .select("id, full_name, status, created_at")
    .order("created_at", { ascending: false });

  const { data: tasksData } = await supabase
    .from("crm_tasks")
    .select("id, lead_id, title, status, priority, due_at")
    .order("due_at", { ascending: true });

  const leads: LeadRow[] = (leadsData ?? []) as LeadRow[];
  const tasks: TaskRow[] = (tasksData ?? []) as TaskRow[];

  const todayStart = startOfTodayLocal();
  const todayEnd = endOfTodayLocal();
  const todayStartIso = toUtcIso(todayStart);
  const todayEndIso = toUtcIso(todayEnd);
  const nowIso = new Date().toISOString();

  const totalLeads = leads.length;
  const newLeads = leads.filter(
    (lead) => normalizeStatus(lead.status) === "new"
  ).length;
  const contacted = leads.filter((lead) =>
    ["contacted", "attempted_contact", "follow_up"].includes(
      normalizeStatus(lead.status)
    )
  ).length;
  const consultScheduled = leads.filter((lead) =>
    ["consult_scheduled", "appointment_scheduled"].includes(
      normalizeStatus(lead.status)
    )
  ).length;
  const accepted = leads.filter((lead) =>
    ["accepted", "won", "converted"].includes(normalizeStatus(lead.status))
  ).length;

  const openTasks = tasks.filter(
    (task) => normalizeStatus(task.status) !== "done"
  ).length;

  const overdueTasks = tasks.filter((task) => {
    if (normalizeStatus(task.status) === "done") return false;
    if (!task.due_at) return false;
    return task.due_at < nowIso;
  });

  const todayTasks = tasks.filter((task) => {
    if (normalizeStatus(task.status) === "done") return false;
    if (!task.due_at) return false;
    return task.due_at >= todayStartIso && task.due_at < todayEndIso;
  });

  const recentLeads = leads.slice(0, 5);
  const displayName =
    profile?.full_name?.trim() || user.email || "3nity Dental User";

  return (
    <main style={pageShellStyle()}>
      <div style={containerStyle()}>
        <section style={panelStyle()}>
          <h1 style={titleStyle()}>Main Dashboard</h1>
          <p style={descStyle()}>
            Welcome back, {displayName}. Use this dashboard to move across CRM
            and other modules.
          </p>

          <div style={{ marginTop: 20 }}>
            <div style={navWrapStyle()}>
              <Link href="/dashboard" style={navButtonStyle(true)}>
                Dashboard
              </Link>
              <Link href="/crm" style={navButtonStyle(false)}>
                CRM
              </Link>
             <Link href="/crm/leads" style={navButtonStyle(false)}>
                Leads
              </Link>
              <Link href="/crm/leads/new" style={navButtonStyle(false)}>
                New Lead
              </Link>
            </div>
          </div>
        </section>

        <section style={panelStyle()}>
          <SectionHeader
            title="CRM Snapshot"
            description="A quick summary of current lead and task activity."
          />

          <div style={{ marginTop: 18, ...statGridStyle() }}>
            <StatCard label="Total Leads" value={totalLeads} />
            <StatCard label="New Leads" value={newLeads} />
            <StatCard label="Contacted" value={contacted} />
            <StatCard label="Consult Scheduled" value={consultScheduled} />
            <StatCard label="Accepted" value={accepted} />
            <StatCard label="Open Tasks" value={openTasks} />
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          <div
            style={{
              ...panelStyle(),
              borderColor: "#f0c8cf",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 24,
                  fontWeight: 900,
                  color: "#b42318",
                }}
              >
                Overdue Tasks
              </h2>

              <Link href="/crm/leads" style={miniButtonStyle()}>
                View Leads
              </Link>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gap: 14,
              }}
            >
              {overdueTasks.length === 0 ? (
                <div
                  style={{
                    border: "1px dashed #f0c8cf",
                    borderRadius: 18,
                    padding: 18,
                    color: "#7a2e35",
                    background: "#fff7f8",
                  }}
                >
                  No overdue tasks.
                </div>
              ) : (
                overdueTasks.slice(0, 4).map((task) => (
                  <div key={task.id} style={listCardStyle(true)}>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 900,
                        color: "#0b1f44",
                        marginBottom: 10,
                      }}
                    >
                      {task.title || "Untitled task"}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: 6,
                        color: "#243b5a",
                        fontSize: 15,
                      }}
                    >
                      <div>
                        <strong>Status:</strong> {task.status || "-"}
                      </div>
                      <div>
                        <strong>Priority:</strong> {task.priority || "-"}
                      </div>
                      <div>
                        <strong>Due:</strong> {formatDateTime(task.due_at)}
                      </div>
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <Link
                       href={
                          task.lead_id
                            ? `/crm/leads/${task.lead_id}`
                            : "/crm/leads"
                        }
                        style={miniButtonStyle()}
                      >
                        {task.lead_id ? "Open Lead" : "View Leads"}
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={panelStyle()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 24,
                  fontWeight: 900,
                  color: "#0b1f44",
                }}
              >
                Today’s Tasks
              </h2>

              <Link href="/crm/leads" style={miniButtonStyle()}>
                View Leads
              </Link>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gap: 14,
              }}
            >
              {todayTasks.length === 0 ? (
                <div
                  style={{
                    border: "1px dashed #d9e0ea",
                    borderRadius: 18,
                    padding: 18,
                    color: "#5d728f",
                    background: "#fbfcfe",
                  }}
                >
                  No tasks due today.
                </div>
              ) : (
                todayTasks.slice(0, 4).map((task) => (
                  <div key={task.id} style={listCardStyle(false)}>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 900,
                        color: "#0b1f44",
                        marginBottom: 10,
                      }}
                    >
                      {task.title || "Untitled task"}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: 6,
                        color: "#243b5a",
                        fontSize: 15,
                      }}
                    >
                      <div>
                        <strong>Status:</strong> {task.status || "-"}
                      </div>
                      <div>
                        <strong>Priority:</strong> {task.priority || "-"}
                      </div>
                      <div>
                        <strong>Due:</strong> {formatDateTime(task.due_at)}
                      </div>
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <Link
                        href={
                          task.lead_id
                            ? `/crm/leads/${task.lead_id}`
                            : "/crm/leads"
                        }
                        style={miniButtonStyle()}
                      >
                        {task.lead_id ? "Open Lead" : "View Leads"}
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section style={panelStyle()}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 900,
                color: "#0b1f44",
              }}
            >
              Recent Leads
            </h2>

            <Link href="/crm/leads" style={miniButtonStyle()}>
              View All Leads
            </Link>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gap: 14,
            }}
          >
            {recentLeads.length === 0 ? (
              <div
                style={{
                  border: "1px dashed #d9e0ea",
                  borderRadius: 18,
                  padding: 18,
                  color: "#5d728f",
                  background: "#fbfcfe",
                }}
              >
                No leads yet.
              </div>
            ) : (
              recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/crm/leads/${lead.id}`}
                  style={{
                    display: "block",
                    textDecoration: "none",
                    color: "inherit",
                    border: "1px solid #d9e0ea",
                    borderRadius: 18,
                    padding: 18,
                    background: "#ffffff",
                  }}
                >
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 900,
                      color: "#0b1f44",
                      marginBottom: 8,
                    }}
                  >
                    {lead.full_name || "Unnamed Lead"}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 6,
                      color: "#5d728f",
                      fontSize: 15,
                    }}
                  >
                    <div>
                      <strong>Status:</strong> {lead.status || "-"}
                    </div>
                    <div>
                      <strong>Created:</strong> {formatDateTime(lead.created_at)}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}