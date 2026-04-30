"use server";

import { redirect } from "next/navigation";
import { createSupabaseDashboardClient } from "@/lib/supabase/dashboard";

export type LoginState = {
  error: string;
};

export async function signIn(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = createSupabaseDashboardClient();

  if (!supabase) {
    return { error: "Supabase dashboard client is not configured" };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = createSupabaseDashboardClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/login");
}
