import type { Route } from "next";

export function normalizeAppRedirectPath(value: string | null | undefined): Route {
  if (!value) return "/" as Route;
  if (!value.startsWith("/") || value.startsWith("//")) return "/" as Route;
  if (value.startsWith("/login") || value.startsWith("/auth/callback")) return "/" as Route;
  return value as Route;
}
