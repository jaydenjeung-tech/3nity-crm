import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { CSSProperties } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id?: string | string[] }> | { id?: string | string[] };
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

type LeadStatus = (typeof STATUS_OPTIONS)[number]["value"];

type LeadRow = {
  id: string;
  clinic_id: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  treatment_interest: string | null;
  status: LeadStatus | null;
  notes: string | null;
  assigned_to: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  converted_to_patient_id: string | null;
  converted_at: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type StaffRow = {
  id: string;
  full_name: string | null;
  role: string | null;
};

function asString(v: FormDataEntryValue | null) {
  return String(v ?? "").trim();
}

function normalizeParamId(value: string | string[] | undefined) {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  const id = String(raw ?? "").trim();

  if (!id) return null;
  if (id === "new") return null;
  if (id === "undefined") return null;
  if (id === "null") return null;

  return id;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isLeadStatus(value: string): value is LeadStatus {
  return STATUS_OPTIONS.some((s) => s.value === value);
}

function toDateTimeLocalInput(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function getStatusLabel(value: LeadStatus | null) {
  return STATUS_OPTIONS.find((s) => s.value === value)?.label ?? "-";
}

function getStatusBadgeStyle(status: LeadStatus | null): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 13,
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
      return {
        ...base,
        background: "#fff7ed",
        color: "#c2410c",
        borderColor: "#fed7aa",
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
    case "followup_needed":
      return {
        ...base,
        background: "#fff7ed",
        color: "#9a3412",
        borderColor: "#fdba74",
      };
    case "accepted":
      return {
        ...base,
        background: "#ecfdf5",
        color: "#047857",
        borderColor: "#a7f3d0",
      };
    case "converted":
      return {
        ...base,
        background: "#f0fdf4",
        color: "#15803d",
        borderColor: "#bbf7d0",
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

async function updateLead(formData: FormData) {
  "use server";

  const supabase = await createSupabaseServerClient();

  const id = asString(formData.get("id"));
  const full_name = asString(formData.get("full_name"));
  const phone = asString(formData.get("phone")) || null;
  const email = asString(formData.get("email")) || null;
  const source = asString(formData.get("source")) || null;
  const treatment_interest = asString(formData.get("treatment_interest")) || null;
  const rawStatus = asString(formData.get("status"));
  const notes = asString(formData.get("notes")) || null;
  const assigned_to = asString(formData.get("assigned_to")) || null;
  const last_contacted_at_raw = asString(formData.get("last_contacted_at"));
  const next_follow_up_at_raw = asString(formData.get("next_follow_up_at"));
  const is_active_raw = asString(formData.get("is_active"));

  if (!id) throw new Error("Lead ID is required.");
  if (!isUuid(id)) throw new Error("Invalid lead ID.");
  if (!full_name) throw new Error("Full name is required.");

  const safeStatus: LeadStatus = isLeadStatus(rawStatus) ? rawStatus : "new_lead";

  const last_contacted_at = last_contacted_at_raw
    ? new Date(last_contacted_at_raw).toISOString()
    : null;

  const next_follow_up_at = next_follow_up_at_raw
    ? new Date(next_follow_up_at_raw).toISOString()
    : null;

  const is_active = is_active_raw === "true";

  const { error } = await supabase
    .from("leads")
    .update({
      full_name,
      phone,
      email,
      source,
      treatment_interest,
      status: safeStatus,
      notes,
      assigned_to,
      last_contacted_at,
      next_follow_up_at,
      is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/crm");
  revalidatePath("/crm/leads");
  revalidatePath(`/crm/leads/${id}`);
  redirect(`/crm/leads/${id}`);
}

export default async function LeadDetailPage(props: PageProps) {
  const params = await props.params;
  const leadId = normalizeParamId(params?.id);

  if (!leadId) {
    notFound();
  }

  if (!isUuid(leadId)) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("id", user.id)
    .single();

  const myClinicId = myProfile?.clinic_id ?? null;

  if (!myClinicId) {
    redirect("/dashboard");
  }

  const { data: lead, error: leadError } = await supabase
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
      converted_to_patient_id,
      converted_at,
      is_active,
      created_at,
      updated_at
    `)
    .eq("id", leadId)
    .eq("clinic_id", myClinicId)
    .single<LeadRow>();

  if (leadError || !lead) {
    notFound();
  }

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("clinic_id", myClinicId)
    .order("full_name", { ascending: true });

  const pageStyle: CSSProperties = {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "16px",
  };

  const wrapStyle: CSSProperties = {
    width: "100%",
    maxWidth: 920,
    margin: "0 auto",
  };

  const topBarStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  };

  const linkStyle: CSSProperties = {
    textDecoration: "none",
    color: "#0f172a",
    fontWeight: 600,
    fontSize: 14,
  };

  const cardStyle: CSSProperties = {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  };

  const sectionStyle: CSSProperties = {
    display: "grid",
    gap: 14,
    marginTop: 18,
  };

  const titleStyle: CSSProperties = {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.15,
    fontWeight: 800,
    color: "#0f172a",
  };

  const metaRowStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
    marginTop: 10,
  };

  const grid2Style: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 14,
  };

  const fieldStyle: CSSProperties = {
    display: "grid",
    gap: 8,
  };

  const labelStyle: CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "#fff",
    fontSize: 16,
    color: "#0f172a",
  };

  const textAreaStyle: CSSProperties = {
    ...inputStyle,
    minHeight: 140,
    resize: "vertical",
  };

  const infoGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  };

  const infoBoxStyle: CSSProperties = {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: "12px 14px",
  };

  const infoLabelStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  };

  const infoValueStyle: CSSProperties = {
    fontSize: 15,
    fontWeight: 600,
    color: "#0f172a",
    wordBreak: "break-word",
  };

  const actionsStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  };

  const primaryBtnStyle: CSSProperties = {
    appearance: "none",
    border: "none",
    borderRadius: 12,
    background: "#0f172a",
    color: "#fff",
    padding: "12px 16px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  };

  const secondaryBtnStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    background: "#fff",
    color: "#0f172a",
    padding: "12px 16px",
    fontSize: 15,
    fontWeight: 700,
  };

  return (
    <div style={pageStyle}>
      <div style={wrapStyle}>
        <div style={topBarStyle}>
          <Link href="/crm/leads" style={linkStyle}>
            ← Back to Leads
          </Link>

          {lead.phone ? (
            <a href={`tel:${lead.phone}`} style={secondaryBtnStyle}>
              Call Lead
            </a>
          ) : null}
        </div>

        <div style={cardStyle}>
          <h1 style={titleStyle}>{lead.full_name || "Unnamed Lead"}</h1>

          <div style={metaRowStyle}>
            <span style={getStatusBadgeStyle(lead.status)}>
              {getStatusLabel(lead.status)}
            </span>

            {!lead.is_active ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                  background: "#f8fafc",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                }}
              >
                Inactive
              </span>
            ) : null}
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={infoGridStyle}>
              <div style={infoBoxStyle}>
                <div style={infoLabelStyle}>Phone</div>
                <div style={infoValueStyle}>{lead.phone || "-"}</div>
              </div>

              <div style={infoBoxStyle}>
                <div style={infoLabelStyle}>Email</div>
                <div style={infoValueStyle}>{lead.email || "-"}</div>
              </div>

              <div style={infoBoxStyle}>
                <div style={infoLabelStyle}>Source</div>
                <div style={infoValueStyle}>{lead.source || "-"}</div>
              </div>

              <div style={infoBoxStyle}>
                <div style={infoLabelStyle}>Treatment Interest</div>
                <div style={infoValueStyle}>{lead.treatment_interest || "-"}</div>
              </div>

              <div style={infoBoxStyle}>
                <div style={infoLabelStyle}>Created</div>
                <div style={infoValueStyle}>{formatDateTime(lead.created_at)}</div>
              </div>

              <div style={infoBoxStyle}>
                <div style={infoLabelStyle}>Updated</div>
                <div style={infoValueStyle}>{formatDateTime(lead.updated_at)}</div>
              </div>

              <div style={infoBoxStyle}>
                <div style={infoLabelStyle}>Last Contact</div>
                <div style={infoValueStyle}>
                  {formatDateTime(lead.last_contacted_at)}
                </div>
              </div>

              <div style={infoBoxStyle}>
                <div style={infoLabelStyle}>Next Follow-up</div>
                <div style={infoValueStyle}>
                  {formatDateTime(lead.next_follow_up_at)}
                </div>
              </div>
            </div>
          </div>

          <form action={updateLead} style={sectionStyle}>
            <input type="hidden" name="id" value={lead.id} />

            <div style={{ marginTop: 6 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                Edit Lead
              </h2>
            </div>

            <div style={grid2Style}>
              <div style={fieldStyle}>
                <label htmlFor="full_name" style={labelStyle}>
                  Full Name *
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  defaultValue={lead.full_name ?? ""}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label htmlFor="phone" style={labelStyle}>
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  defaultValue={lead.phone ?? ""}
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label htmlFor="email" style={labelStyle}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  defaultValue={lead.email ?? ""}
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label htmlFor="source" style={labelStyle}>
                  Source
                </label>
                <input
                  id="source"
                  name="source"
                  defaultValue={lead.source ?? ""}
                  placeholder="Website, Yelp, Walk-in, Referral..."
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label htmlFor="treatment_interest" style={labelStyle}>
                  Treatment Interest
                </label>
                <select
                  id="treatment_interest"
                  name="treatment_interest"
                  defaultValue={lead.treatment_interest ?? ""}
                  style={inputStyle}
                >
                  <option value="">Select treatment</option>
                  <option value="implant">Implant</option>
                  <option value="crown">Crown</option>
                  <option value="veneer">Veneer</option>
                  <option value="ortho">Ortho</option>
                  <option value="denture">Denture</option>
                  <option value="whitening">Whitening</option>
                  <option value="retainer">Retainer</option>
                  <option value="night_guard">Night Guard</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={fieldStyle}>
                <label htmlFor="status" style={labelStyle}>
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={lead.status ?? "new_lead"}
                  style={inputStyle}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={fieldStyle}>
                <label htmlFor="assigned_to" style={labelStyle}>
                  Assigned To
                </label>
                <select
                  id="assigned_to"
                  name="assigned_to"
                  defaultValue={lead.assigned_to ?? ""}
                  style={inputStyle}
                >
                  <option value="">Unassigned</option>
                  {(staff ?? []).map((member: StaffRow) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name || member.role || member.id}
                    </option>
                  ))}
                </select>
              </div>

              <div style={fieldStyle}>
                <label htmlFor="is_active" style={labelStyle}>
                  Active
                </label>
                <select
                  id="is_active"
                  name="is_active"
                  defaultValue={lead.is_active === false ? "false" : "true"}
                  style={inputStyle}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              <div style={fieldStyle}>
                <label htmlFor="last_contacted_at" style={labelStyle}>
                  Last Contacted At
                </label>
                <input
                  id="last_contacted_at"
                  name="last_contacted_at"
                  type="datetime-local"
                  defaultValue={toDateTimeLocalInput(lead.last_contacted_at)}
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label htmlFor="next_follow_up_at" style={labelStyle}>
                  Next Follow-up At
                </label>
                <input
                  id="next_follow_up_at"
                  name="next_follow_up_at"
                  type="datetime-local"
                  defaultValue={toDateTimeLocalInput(lead.next_follow_up_at)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={fieldStyle}>
              <label htmlFor="notes" style={labelStyle}>
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                defaultValue={lead.notes ?? ""}
                rows={8}
                style={textAreaStyle}
                placeholder="Add follow-up notes, consult summary, treatment discussion, patient concerns..."
              />
            </div>

            <div style={actionsStyle}>
              <button type="submit" style={primaryBtnStyle}>
                Save Changes
              </button>

              <Link href="/crm/leads" style={secondaryBtnStyle}>
                Back to Leads
              </Link>

              <button
                type="button"
                disabled
                title="Enable after patients table is ready"
                style={{
                  ...secondaryBtnStyle,
                  opacity: 0.55,
                  cursor: "not-allowed",
                }}
              >
                Convert to Patient
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}