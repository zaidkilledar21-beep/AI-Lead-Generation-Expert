import { NextResponse } from "next/server";
import { normalizeAppRedirectPath } from "@/lib/app/redirects";
import { createSupabaseDashboardClient } from "@/lib/supabase/dashboard";

function loginRedirect(requestUrl: URL, reason: string) {
  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set("error", reason);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = normalizeAppRedirectPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return loginRedirect(requestUrl, "missing_auth_code");
  }

  const supabase = await createSupabaseDashboardClient();
  if (!supabase) {
    return loginRedirect(requestUrl, "auth_not_configured");
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return loginRedirect(requestUrl, "auth_callback_failed");
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
