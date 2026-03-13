import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
  { value: "ortho", label: "Orthodontics" },
  { value: "whitening", label: "Whitening" },
  { value: "general", label: "General Dentistry" },
  { value: "other", label: "Other" },
];

function asString(v: FormDataEntryValue | null) {
  return String(v ?? "").trim();
}

async function createLead(formData: FormData) {
  "use server";

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: myProfileRows, error: myProfileError } = await supabase
    .from("profiles")
    .select("id, clinic_id")
    .eq("id", user.id);

  const myProfile = myProfileRows?.[0] ?? null;

  if (myProfileError || !myProfile?.clinic_id) {
    throw new Error("profiles 테이블에서 clinic_id를 찾지 못했습니다.");
  }

  const clinicId = myProfile.clinic_id;

  const full_name = asString(formData.get("full_name"));
  const phone = asString(formData.get("phone")) || null;
  const email = asString(formData.get("email")) || null;
  const source = asString(formData.get("source")) || null;
  const treatment_interest = asString(formData.get("treatment_interest")) || null;
  const notes = asString(formData.get("notes")) || null;
  const assigned_to = asString(formData.get("assigned_to")) || null;
  const last_contacted_at_raw = asString(formData.get("last_contacted_at"));
  const next_follow_up_at_raw = asString(formData.get("next_follow_up_at"));

  if (!full_name) {
    throw new Error("Full Name is required.");
  }

  const last_contacted_at = last_contacted_at_raw
    ? new Date(last_contacted_at_raw).toISOString()
    : null;

  const next_follow_up_at = next_follow_up_at_raw
    ? new Date(next_follow_up_at_raw).toISOString()
    : null;

  const { data, error } = await supabase
    .from("leads")
    .insert({
      clinic_id: clinicId,
      full_name,
      phone,
      email,
      source,
      treatment_interest,
      status: "new",
      notes,
      assigned_to,
      last_contacted_at,
      next_follow_up_at,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/crm/leads/${data.id}`);
}

export default async function NewLeadPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const pageWrapClass = "mx-auto max-w-6xl";
  const cardClass =
    "rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-8";
  const labelClass = "mb-2 block text-base font-extrabold text-slate-900";
  const inputClass =
    "w-full rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-lg text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0d2a66]";
  const selectClass =
    "w-full rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-lg text-slate-900 outline-none transition focus:border-[#0d2a66]";
  const textareaClass =
    "min-h-[150px] w-full rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-lg text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0d2a66]";
  const secondaryBtnClass =
    "inline-flex min-h-[46px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-900";
  const primaryBtnClass =
    "inline-flex min-h-[46px] items-center justify-center rounded-xl bg-[#0d2a66] px-5 py-2 text-sm font-extrabold text-white";

  return (
    <div className={pageWrapClass}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/crm/leads" className="text-lg font-semibold text-slate-900">
          ← Back to Leads
        </Link>

        <div className="flex flex-wrap gap-2">
          <Link href="/crm" className={secondaryBtnClass}>
            Pipeline
          </Link>
          <Link href="/crm/leads" className={secondaryBtnClass}>
            Leads
          </Link>
        </div>
      </div>

      <section className={cardClass}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-[#0d2a66]">
              New Lead
            </h1>
            <p className="mt-3 text-lg text-slate-600">
              Create a new patient inquiry and add follow-up details.
            </p>
          </div>
        </div>

        <form action={createLead} className="mt-8 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="full_name" className={labelClass}>
                Full Name *
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                placeholder="Enter patient name"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="assigned_to" className={labelClass}>
                Assigned To
              </label>
              <input
                id="assigned_to"
                name="assigned_to"
                type="text"
                placeholder="Enter staff name"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="phone" className={labelClass}>
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="text"
                placeholder="Enter phone number"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter email address"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="source" className={labelClass}>
                Source
              </label>
              <select id="source" name="source" defaultValue="" className={selectClass}>
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option.value || "blank-source"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="treatment_interest" className={labelClass}>
                Treatment Interest
              </label>
              <select
                id="treatment_interest"
                name="treatment_interest"
                defaultValue=""
                className={selectClass}
              >
                {TREATMENT_OPTIONS.map((option) => (
                  <option
                    key={option.value || "blank-treatment"}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="last_contacted_at" className={labelClass}>
                Last Contacted At
              </label>
              <input
                id="last_contacted_at"
                name="last_contacted_at"
                type="datetime-local"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="next_follow_up_at" className={labelClass}>
                Next Follow-up At
              </label>
              <input
                id="next_follow_up_at"
                name="next_follow_up_at"
                type="datetime-local"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className={labelClass}>
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              placeholder="Add patient concerns, insurance notes, scheduling details, and follow-up summary."
              className={textareaClass}
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="submit" className={primaryBtnClass}>
              Create Lead
            </button>

            <Link href="/crm/leads" className={secondaryBtnClass}>
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}