import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: string | null;
  clinic_id: string | null;
};

const SOURCE_OPTIONS = [
  { value: "", label: "Select source" },
  { value: "phone", label: "Phone" },
  { value: "walk_in", label: "Walk-in" },
  { value: "website", label: "Website" },
  { value: "google", label: "Google" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "referral", label: "Referral" },
  { value: "existing_patient", label: "Existing Patient" },
  { value: "other", label: "Other" },
];

const TREATMENT_OPTIONS = [
  { value: "", label: "Select treatment" },
  { value: "implant", label: "Implant" },
  { value: "veneers", label: "Veneers" },
  { value: "crown", label: "Crown" },
  { value: "bridge", label: "Bridge" },
  { value: "denture", label: "Denture" },
  { value: "night_guard", label: "Night Guard" },
  { value: "orthodontics", label: "Orthodontics" },
  { value: "whitening", label: "Whitening" },
  { value: "general_dentistry", label: "General Dentistry" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "new_lead", label: "New Lead" },
  { value: "attempted_contact", label: "Attempted Contact" },
  { value: "contacted", label: "Contacted" },
  { value: "consult_scheduled", label: "Consult Scheduled" },
  { value: "treatment_presented", label: "Treatment Presented" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

function toNullableText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
}

function normalizeTreatmentInterest(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? text.toLowerCase().replace(/\s+/g, "_") : null;
}

function normalizeSource(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? text.toLowerCase().replace(/\s+/g, "_") : null;
}

function normalizeStatus(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? text.toLowerCase().replace(/\s+/g, "_") : "new_lead";
}

function Field({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

function Label({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-lg font-bold tracking-tight text-slate-900"
    >
      {children}
    </label>
  );
}

function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-16 rounded-[24px] border border-slate-300 bg-white px-6 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${className}`}
    />
  );
}

function Select({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-16 rounded-[24px] border border-slate-300 bg-white px-6 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${className}`}
    >
      {children}
    </select>
  );
}

function TextArea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-[180px] rounded-[24px] border border-slate-300 bg-white px-6 py-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${className}`}
    />
  );
}

export default async function NewLeadPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: myProfile, error: myProfileError } = await supabase
    .from("profiles")
    .select("id, full_name, role, clinic_id")
    .eq("id", user.id)
    .single();

  if (myProfileError) {
    throw new Error(myProfileError.message);
  }

  const myClinicId = myProfile?.clinic_id;

  if (!myClinicId) {
    throw new Error("Current user does not have a clinic_id in profiles.");
  }

  async function createLead(formData: FormData) {
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
      .select("clinic_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      throw new Error(profileError.message);
    }

    const clinic_id = profile?.clinic_id;

    if (!clinic_id) {
      throw new Error("Current user does not have a clinic_id in profiles.");
    }

    const full_name = String(formData.get("full_name") ?? "").trim();
    if (!full_name) {
      throw new Error("Full Name is required.");
    }

    const assigned_to_raw = String(formData.get("assigned_to") ?? "").trim();

    const phone = toNullableText(formData.get("phone"));
    const email = toNullableText(formData.get("email"));
    const source = normalizeSource(formData.get("source"));
    const treatment_interest = normalizeTreatmentInterest(
      formData.get("treatment_interest")
    );
    const status = normalizeStatus(formData.get("status"));
    const last_contacted_at = toNullableText(formData.get("last_contacted_at"));
    const next_follow_up_at = toNullableText(formData.get("next_follow_up_at"));
    const notes = toNullableText(formData.get("notes"));
    const assigned_to = assigned_to_raw || null;

    const { data, error } = await supabase
      .from("leads")
      .insert({
        clinic_id,
        full_name,
        assigned_to,
        phone,
        email,
        source,
        treatment_interest,
        status,
        last_contacted_at,
        next_follow_up_at,
        notes,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    redirect(`/crm/leads/${data.id}`);
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, role, clinic_id")
    .eq("clinic_id", myClinicId)
    .order("full_name", { ascending: true });

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const assignees: ProfileRow[] = (profiles ?? []) as ProfileRow[];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
              New Lead
            </h1>
            <p className="mt-2 text-sm text-slate-600 md:text-base">
              Create a new patient inquiry and add follow-up details.
            </p>
          </div>

          <Link
            href="/crm/leads"
            className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
          >
            Back
          </Link>
        </div>

        <form
          action={createLead}
          className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-8"
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                name="full_name"
                placeholder="Enter patient name"
                required
              />
            </Field>

            <Field>
              <Label htmlFor="assigned_to">Assigned To</Label>
              <Select id="assigned_to" name="assigned_to" defaultValue="">
                <option value="">Unassigned</option>
                {assignees.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.full_name?.trim() || "Unnamed User"}
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="Enter phone number"
              />
            </Field>

            <Field>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter email address"
              />
            </Field>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
            <Field>
              <Label htmlFor="source">Source</Label>
              <Select id="source" name="source" defaultValue="">
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option.value || "blank-source"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label htmlFor="treatment_interest">Treatment Interest</Label>
              <Select
                id="treatment_interest"
                name="treatment_interest"
                defaultValue=""
              >
                {TREATMENT_OPTIONS.map((option) => (
                  <option
                    key={option.value || "blank-treatment"}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label htmlFor="status">Initial Status</Label>
              <Select id="status" name="status" defaultValue="new_lead">
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field>
              <Label htmlFor="last_contacted_at">Last Contacted At</Label>
              <Input
                id="last_contacted_at"
                name="last_contacted_at"
                type="datetime-local"
              />
            </Field>

            <Field>
              <Label htmlFor="next_follow_up_at">Next Follow Up At</Label>
              <Input
                id="next_follow_up_at"
                name="next_follow_up_at"
                type="datetime-local"
              />
            </Field>
          </div>

          <div className="mt-5">
            <Field>
              <Label htmlFor="notes">Notes</Label>
              <TextArea
                id="notes"
                name="notes"
                placeholder="Add patient concerns, insurance notes, or follow-up summary."
                rows={6}
              />
            </Field>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/crm/leads"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Create Lead
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}