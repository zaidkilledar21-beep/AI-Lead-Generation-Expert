"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navItems = [
  { href: "/pipeline", label: "Pipeline", badge: null },
  { href: "/campaigns", label: "Campaigns", badge: null },
  { href: "/inbox", label: "Inbox", badge: "0" },
  { href: "/review", label: "Review Queue", badge: "0" },
  { href: "/analytics", label: "Analytics", badge: null },
  { href: "/settings", label: "Settings", badge: null }
];

export function CrmShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

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
            return (
              <a className={active ? "active" : ""} href={item.href} key={item.href} aria-current={active ? "page" : undefined}>
                <span>{item.label}</span>
                {item.badge ? <span className="nav-badge" aria-label={`${item.label} count`}>{item.badge}</span> : null}
              </a>
            );
          })}
        </nav>
      </aside>
      <div className="crm-main">
        <header className="crm-topbar">
          <form className="global-search" role="search">
            <label className="sr-only" htmlFor="global-search">Search CRM</label>
            <input id="global-search" name="q" placeholder="Search business, email, niche, city" />
          </form>
          <div className="topbar-actions">
            <button className="global-pause" type="button" aria-pressed="false">Global pause</button>
            <button className="notification-button" type="button" aria-label="Notifications">0</button>
            <div className="founder-chip" aria-label="Logged in founder">Founder</div>
          </div>
        </header>
        <main className="crm-content">{children}</main>
      </div>
    </div>
  );
}
