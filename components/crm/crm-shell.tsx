"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toggleGlobalPauseAction } from "@/app/settings/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/server";

type CrmShellProps = {
  children: ReactNode;
  initialInboxUnhandled: number;
  initialReviewPending: number;
  initialGlobalPaused: boolean;
  founderName: string;
};

const navItems = [
  { href: "/pipeline", label: "Pipeline" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/inbox", label: "Inbox", badgeKey: "inbox" as const },
  { href: "/review", label: "Review Queue", badgeKey: "review" as const },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" }
];

export function CrmShell({
  children,
  initialInboxUnhandled,
  initialReviewPending,
  initialGlobalPaused,
  founderName
}: CrmShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [inboxUnhandled, setInboxUnhandled] = useState(initialInboxUnhandled);
  const [reviewPending, setReviewPending] = useState(initialReviewPending);
  const [globalPaused, setGlobalPaused] = useState(initialGlobalPaused);

  const searchTarget = useMemo(() => {
    if (pathname.startsWith("/inbox")) return "/inbox";
    if (pathname.startsWith("/campaigns")) return "/campaigns";
    return "/pipeline";
  }, [pathname]);

  useEffect(() => {
    setInboxUnhandled(initialInboxUnhandled);
    setReviewPending(initialReviewPending);
    setGlobalPaused(initialGlobalPaused);
  }, [initialGlobalPaused, initialInboxUnhandled, initialReviewPending]);

  useEffect(() => {
    if (pathname === "/login") return;

    const supabase = createSupabaseBrowserClient();
    const refresh = () => router.refresh();
    const channel = supabase
      .channel("crm-shell")
      .on("postgres_changes", { event: "*", schema: "public", table: "reply_events" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "manual_review_queue" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pathname, router]);

  useEffect(() => {
    if (pathname === "/login") return;

    let pendingPrefix: "g" | null = null;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.closest("input, textarea, select")) return;
      const key = event.key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        const input = document.getElementById("global-search");
        input?.focus();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && key === "p") {
        event.preventDefault();
        setGlobalPaused((value) => !value);
        return;
      }

      if (key === "g") {
        pendingPrefix = "g";
        window.setTimeout(() => {
          pendingPrefix = null;
        }, 800);
        return;
      }

      if (pendingPrefix === "g") {
        pendingPrefix = null;
        if (key === "p") router.push("/pipeline");
        if (key === "c") router.push("/campaigns");
        if (key === "i") router.push("/inbox");
        if (key === "r") router.push("/review");
        if (key === "a") router.push("/analytics");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pathname, router]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="crm-shell">
      <aside className="crm-sidebar" aria-label="CRM navigation">
        <a className="crm-brand" href="/pipeline" aria-label="AI Automation CRM home">
          <span className="crm-brand-mark">AA</span>
          <span>
            <strong>Outreach CRM</strong>
            <small>AI Automation</small>
          </span>
        </a>
        <nav className="crm-nav" aria-label="Primary">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const badge = item.badgeKey === "inbox" ? inboxUnhandled : item.badgeKey === "review" ? reviewPending : null;

            return (
              <a className={active ? "active" : ""} href={item.href} key={item.href} aria-current={active ? "page" : undefined}>
                <span>{item.label}</span>
                {typeof badge === "number" ? <span className="nav-badge">{badge}</span> : null}
              </a>
            );
          })}
        </nav>
      </aside>
      <div className="crm-main">
        <header className="crm-topbar">
          <form className="global-search" role="search" action={searchTarget}>
            <label className="sr-only" htmlFor="global-search">Search CRM</label>
            <input id="global-search" name="q" placeholder="Search business, email, niche, city" />
          </form>
          <div className="topbar-actions">
            <form action={toggleGlobalPauseAction}>
              <input type="hidden" name="paused" value={String(!globalPaused)} />
              <button className={`global-pause ${globalPaused ? "is-paused" : ""}`.trim()} type="submit" aria-pressed={globalPaused}>
                {globalPaused ? "Outreach paused" : "Outreach live"}
              </button>
            </form>
            <button className="notification-button" type="button" aria-label="Notifications">
              {inboxUnhandled + reviewPending}
            </button>
            <div className="founder-chip" aria-label="Logged in founder">{founderName}</div>
          </div>
        </header>
        <main className="crm-content">{children}</main>
      </div>
    </div>
  );
}
