import { createSupabaseDashboardClient } from "@/lib/supabase/dashboard";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type AppActor = {
  userId: string;
  email: string | null;
  displayName: string;
  role: "founder" | "admin" | "viewer";
};

function resolveDisplayName(metadata?: Record<string, unknown>): string | null {
  if (typeof metadata?.display_name === "string") return metadata.display_name;
  if (typeof metadata?.name === "string") return metadata.name;
  return null;
}

export async function requireAppActor(allowedRoles: AppActor["role"][] = ["founder", "admin"]) {
  const authClient = await createSupabaseDashboardClient();
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

  const metadataName = resolveDisplayName(user.user_metadata);

  return {
    userId: user.id,
    email: user.email ?? null,
    displayName: metadataName ?? user.email ?? user.id,
    role: dashboardUser.role as AppActor["role"]
  };
}
