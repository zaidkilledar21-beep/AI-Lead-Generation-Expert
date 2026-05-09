"use server";

import { redirect } from "next/navigation";
import { DASHBOARD_READ_ROLES, DashboardAuthError, getActiveDashboardUserRole } from "@/lib/app/auth";
import { normalizeAppRedirectPath } from "@/lib/app/redirects";
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
  const next = normalizeAppRedirectPath(str(formData.get("next"), "/"));
  const supabase = await createSupabaseDashboardClient();

  if (!supabase) {
    return { error: "Supabase dashboard client is not configured" };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Sign in succeeded but no dashboard session was returned. Please try again." };
  }

  try {
    const role = await getActiveDashboardUserRole(data.user.id);
    if (!DASHBOARD_READ_ROLES.includes(role)) {
      await supabase.auth.signOut();
      return { error: "Dashboard access is forbidden for this account" };
    }
  } catch (error) {
    if (error instanceof DashboardAuthError && error.code === "inactive") {
      await supabase.auth.signOut();
      return { error: "Dashboard access is inactive for this account" };
    }

    if (error instanceof DashboardAuthError && error.code === "forbidden") {
      await supabase.auth.signOut();
      return { error: "Dashboard access is forbidden for this account" };
    }

    return { error: "Unable to verify dashboard access. Please try again." };
  }

  redirect(next);
}

export async function signOut() {
  const supabase = await createSupabaseDashboardClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/login");
}
