import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

export const CRM_REALTIME_REFRESH_DELAY_MS = 500;
const CRM_REALTIME_TABLES = [
  "reply_events",
  "manual_review_queue",
  "email_drafts",
  "outreach_queue",
  "outreach_events",
  "app_settings"
];

export function useCrmRealtime() {
  const router = useRouter();

  useEffect(() => {
    // We only create the client if we have the env vars available in the browser
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return;
    }
    
    const supabase = createSupabaseBrowserClient();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        router.refresh();
      }, CRM_REALTIME_REFRESH_DELAY_MS);
    };

    const channel = supabase.channel("crm_lifecycle_changes");
    CRM_REALTIME_TABLES.forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, scheduleRefresh);
    });
    const crmSubscription = channel.subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(crmSubscription);
    };
  }, [router]);
}
