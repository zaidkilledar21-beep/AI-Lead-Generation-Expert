import { createSupabaseDashboardClient } from "@/lib/supabase/dashboard";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type AppActor = {
  userId: string;
  email: string | null;
  displayName: string;
  role: "founder" | "admin" | "operator" | "viewer";
};

export const DASHBOARD_READ_ROLES: AppActor["role"][] = ["founder", "admin", "operator", "viewer"];
export const DASHBOARD_WRITE_ROLES: AppActor["role"][] = ["founder", "admin", "operator"];
export const DASHBOARD_ADMIN_ROLES: AppActor["role"][] = ["founder", "admin"];

export class DashboardAuthError extends Error {
  constructor(
    message: string,
    readonly code: "auth_required" | "inactive" | "forbidden" | "misconfigured" | "lookup_failed"
  ) {
    super(message);
    this.name = "DashboardAuthError";
  }
}

function resolveDisplayName(metadata?: Record<string, unknown>): string | null {
  if (typeof metadata?.display_name === "string") return metadata.display_name;
  if (typeof metadata?.name === "string") return metadata.name;
  return null;
}

export async function getActiveDashboardUserRole(userId: string) {
  const serviceClient = createSupabaseServiceClient();
  const { data: dashboardUser, error: dashboardUserError } = await serviceClient
    .from("dashboard_users")
    .select("role,active")
    .eq("user_id", userId)
    .maybeSingle();

  if (dashboardUserError) {
    throw new DashboardAuthError(dashboardUserError.message, "lookup_failed");
  }

  if (!dashboardUser?.active) {
    throw new DashboardAuthError("Dashboard access is not active", "inactive");
  }

  return dashboardUser.role as AppActor["role"];
}

export async function requireDashboardActor(allowedRoles: AppActor["role"][] = DASHBOARD_READ_ROLES) {
  const authClient = await createSupabaseDashboardClient();
  if (!authClient) throw new DashboardAuthError("Dashboard Supabase client is not configured", "misconfigured");

  const {
    data: { user },
    error: userError
  } = await authClient.auth.getUser();

  if (userError || !user) {
    throw new DashboardAuthError("Authentication required", "auth_required");
  }

  const role = await getActiveDashboardUserRole(user.id);
  if (!allowedRoles.includes(role)) {
    throw new DashboardAuthError("Insufficient dashboard permissions", "forbidden");
  }

  const metadataName = resolveDisplayName(user.user_metadata);

  return {
    userId: user.id,
    email: user.email ?? null,
    displayName: metadataName ?? user.email ?? user.id,
    role
  };
}

export async function requireDashboardRole(allowedRoles: AppActor["role"][]) {
  return requireDashboardActor(allowedRoles);
}

export async function requireDashboardWriteAccess() {
  return requireDashboardActor(DASHBOARD_WRITE_ROLES);
}

export async function requireDashboardAdminAccess() {
  return requireDashboardActor(DASHBOARD_ADMIN_ROLES);
}

export async function requireAppActor(allowedRoles: AppActor["role"][] = DASHBOARD_WRITE_ROLES) {
  return requireDashboardActor(allowedRoles);
}
