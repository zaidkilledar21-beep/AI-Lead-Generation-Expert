"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
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

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
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
