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

    // Listen for changes on reply_events for the inbox badge
    const replySubscription = supabase
      .channel("reply_events_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reply_events", filter: "requires_human_review=eq.true" },
        () => {
          // Instead of fetching manually, we'll refresh the route to let Server Components handle data fetching 
          // while falling back to basic increment/decrement or a refetch if we wanted purely client side.
          // For now, router.refresh() will re-fetch the layout layout data.
          router.refresh();
        }
      )
      .subscribe();

    // Listen for changes on manual_review_queue for the review badge
    const reviewSubscription = supabase
      .channel("manual_review_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "manual_review_queue", filter: "review_status=eq.pending" },
        () => {
          router.refresh();
        }
      )
      .subscribe();
      
    // Listen for changes on app_settings for global pause
    const settingsSubscription = supabase
      .channel("app_settings_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings", filter: "key=eq.global_outreach" },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(replySubscription);
      supabase.removeChannel(reviewSubscription);
      supabase.removeChannel(settingsSubscription);
    };
  }, [router]);
}
