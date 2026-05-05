import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

export function useCrmRealtime() {
  const router = useRouter();

  useEffect(() => {
    // We only create the client if we have the env vars available in the browser
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return;
    }
    
    const supabase = createSupabaseBrowserClient();

    const crmSubscription = supabase
      .channel("crm_lifecycle_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "reply_events" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "manual_review_queue" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "email_drafts" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "outreach_queue" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "outreach_events" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, () => router.refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(crmSubscription);
    };
  }, [router]);
}
