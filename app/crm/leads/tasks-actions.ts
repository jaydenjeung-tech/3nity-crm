"use server";

import { revalidatePath } from "next/cache";
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

async function assertLeadInSameClinic(
  supabase: any,
  leadId: string,
  clinicId: string
) {
  const { data: lead, error } = await supabase
    .from("leads")
    .select("id, clinic_id")
    .eq("id", leadId)
    .eq("clinic_id", clinicId)
    .single();

  if (error || !lead) {
    throw new Error("Lead not found or not in your clinic");
  }

  return lead;
}

export async function createLeadTask(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const profile = await getProfileOrThrow(supabase);

  const leadId = String(formData.get("lead_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priority = String(formData.get("priority") ?? "normal").trim();
  const assignedTo = String(formData.get("assigned_to") ?? "").trim();
  const dueAt = String(formData.get("due_at") ?? "").trim();

  if (!leadId) {
    throw new Error("Missing lead_id");
  }

  if (!title) {
    throw new Error("Task title is required");
  }

  await assertLeadInSameClinic(supabase, leadId, profile.clinic_id!);

  const payload: Record<string, any> = {
    lead_id: leadId,
    title,
    description: description || null,
    status: "open",
    priority: priority || "normal",
    assigned_to: assignedTo || null,
    due_at: dueAt || null,
    created_by: profile.id,
  };

  const { error } = await supabase.from("lead_tasks").insert(payload);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/crm/leads");
  revalidatePath(`/crm/leads/${leadId}`);
}

export async function updateLeadTaskStatus(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const profile = await getProfileOrThrow(supabase);

  const taskId = String(formData.get("task_id") ?? "").trim();
  const leadId = String(formData.get("lead_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!taskId || !leadId) {
    throw new Error("Missing task_id or lead_id");
  }

  await assertLeadInSameClinic(supabase, leadId, profile.clinic_id!);

  const updates: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "done") {
    updates.completed_at = new Date().toISOString();
  } else {
    updates.completed_at = null;
  }

  const { error } = await supabase
    .from("lead_tasks")
    .update(updates)
    .eq("id", taskId)
    .eq("lead_id", leadId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/crm/leads");
  revalidatePath(`/crm/leads/${leadId}`);
}

export async function deleteLeadTask(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const profile = await getProfileOrThrow(supabase);

  const taskId = String(formData.get("task_id") ?? "").trim();
  const leadId = String(formData.get("lead_id") ?? "").trim();

  if (!taskId || !leadId) {
    throw new Error("Missing task_id or lead_id");
  }

  await assertLeadInSameClinic(supabase, leadId, profile.clinic_id!);

  const { error } = await supabase
    .from("lead_tasks")
    .delete()
    .eq("id", taskId)
    .eq("lead_id", leadId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/crm/leads");
  revalidatePath(`/crm/leads/${leadId}`);
}