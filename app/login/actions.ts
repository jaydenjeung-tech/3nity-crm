"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function asString(v: FormDataEntryValue | null) {
  return String(v ?? "").trim();
}

async function getUserRoleOrNull(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  const role = String(data.role ?? "").trim().toLowerCase();
  return role || null;
}

function getLandingPathByRole(role: string | null) {
  if (role === "inventory") return "/inventory";
  if (role === "doctor") return "/crm";
  if (role === "manager") return "/crm";
  if (role === "sales") return "/crm";
  if (role === "admin") return "/dashboard";
  return "/dashboard";
}

export async function signInAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const email = asString(formData.get("email")).toLowerCase();
  const password = asString(formData.get("password"));
  const next = asString(formData.get("next"));

  if (!email || !password) {
    redirect("/login?error=Please%20enter%20email%20and%20password");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user ? await getUserRoleOrNull(supabase, user.id) : null;

  if (next && next.startsWith("/")) {
    redirect(next);
  }

  redirect(getLandingPathByRole(role));
}