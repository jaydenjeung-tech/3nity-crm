"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  clinic_id: string | null;
};

async function getProfileOrThrow(supabase: any): Promise<ProfileRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, clinic_id")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    throw new Error("Profile not found");
  }

  if (!profile.clinic_id) {
    throw new Error("Your profile is missing clinic_id");
  }

  return profile as ProfileRow;
}

export async function convertLeadToPatient(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  await getProfileOrThrow(supabase);

  const leadId = String(formData.get("lead_id") ?? "").trim();

  if (!leadId) {
    throw new Error("Missing lead_id");
  }

  const { data: patientId, error } = await supabase.rpc(
    "convert_lead_to_patient",
    {
      p_lead_id: leadId,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/crm");
  revalidatePath("/crm/leads");
  revalidatePath(`/crm/leads/${leadId}`);
  revalidatePath("/crm/patients");

  redirect(`/crm/patients/${patientId}`);
}