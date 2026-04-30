const serverOnlyKeys = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "DEEPSEEK_API_KEY",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
  "GOOGLE_PLACES_API_KEY",
  "N8N_API_KEY",
  "N8N_ENCRYPTION_KEY"
] as const;

export function getRequiredEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function assertServerOnlyEnvNotPublic() {
  const leaked = serverOnlyKeys.filter((key) => key.startsWith("NEXT_PUBLIC_"));

  if (leaked.length > 0) {
    throw new Error(`Server-only keys cannot be NEXT_PUBLIC: ${leaked.join(", ")}`);
  }
}
