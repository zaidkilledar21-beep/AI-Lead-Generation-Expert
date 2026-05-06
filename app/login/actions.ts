"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { DASHBOARD_READ_ROLES, getActiveDashboardUserRole } from "@/lib/app/auth";
import { createSupabaseDashboardClient } from "@/lib/supabase/dashboard";

export type LoginState = {
  error: string;
};

function str(value: FormDataEntryValue | null, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export async function signIn(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const email = str(formData.get("email"));
  const password = str(formData.get("password"));
  const next = normalizeRedirectPath(str(formData.get("next"), "/"));
  const supabase = await createSupabaseDashboardClient();

  if (!supabase) {
    return { error: "Supabase dashboard client is not configured" };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  try {
    const role = data.user ? await getActiveDashboardUserRole(data.user.id) : null;
    if (!role || !DASHBOARD_READ_ROLES.includes(role)) {
      await supabase.auth.signOut();
      return { error: "Dashboard access is not active" };
    }
  } catch {
    await supabase.auth.signOut();
    return { error: "Dashboard access is not active" };
  }

  redirect(next as unknown as Route);
}

export async function signOut() {
  const supabase = await createSupabaseDashboardClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/login");
}

function normalizeRedirectPath(value: string): Route {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/login")) return "/";
  return value as unknown as Route;
}
