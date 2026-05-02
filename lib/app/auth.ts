import { createSupabaseDashboardClient } from "@/lib/supabase/dashboard";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type AppActor = {
  userId: string;
  email: string | null;
  displayName: string;
  role: "founder" | "admin" | "viewer";
};

export async function requireAppActor(allowedRoles: AppActor["role"][] = ["founder", "admin"]) {
  const authClient = createSupabaseDashboardClient();
  if (!authClient) throw new Error("Dashboard Supabase client is not configured");

  const {
    data: { user },
    error: userError
  } = await authClient.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required");
  }

  const serviceClient = createSupabaseServiceClient();
  const { data: dashboardUser, error: dashboardUserError } = await serviceClient
    .from("dashboard_users")
    .select("role,active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (dashboardUserError) throw new Error(dashboardUserError.message);
  if (!dashboardUser?.active) throw new Error("Dashboard access is not active");
  if (!allowedRoles.includes(dashboardUser.role as AppActor["role"])) {
    throw new Error("Insufficient dashboard permissions");
  }

  const metadataName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null;

  return {
    userId: user.id,
    email: user.email ?? null,
    displayName: metadataName ?? user.email ?? user.id,
    role: dashboardUser.role as AppActor["role"]
  };
}
