"use server";

import { redirect } from "next/navigation";
import { createSupabaseDashboardClient } from "@/lib/supabase/dashboard";

export type LoginState = {
  error: string;
};

export async function signIn(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = normalizeRedirectPath(String(formData.get("next") ?? "/"));
  const supabase = createSupabaseDashboardClient();

  if (!supabase) {
    return { error: "Supabase dashboard client is not configured" };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect(next);
}

export async function signOut() {
  const supabase = createSupabaseDashboardClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/login");
}

function normalizeRedirectPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/login")) return "/";
  return value;
}
