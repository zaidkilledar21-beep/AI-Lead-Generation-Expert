"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Megaphone, Inbox, CheckSquare, BarChart3, Settings, Search, Bell, PauseCircle, Fingerprint } from "lucide-react";

// Removed static navItems, will construct dynamically inside the component

interface CrmShellProps {
  children: ReactNode;
  initialInboxUnhandled?: number;
  initialReviewPending?: number;
  initialGlobalPaused?: boolean;
  founderName?: string;
}

export function CrmShell({ 
  children, 
  initialInboxUnhandled = 0,
  initialReviewPending = 0,
  initialGlobalPaused = false,
  founderName = "Founder"
}: Readonly<CrmShellProps>) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  const navItems = [
    { href: "/pipeline", label: "Pipeline", icon: LayoutDashboard, badge: null },
    { href: "/campaigns", label: "Campaigns", icon: Megaphone, badge: null },
    { href: "/inbox", label: "Inbox", icon: Inbox, badge: initialInboxUnhandled > 0 ? String(initialInboxUnhandled) : null },
    { href: "/review", label: "Review Queue", icon: CheckSquare, badge: initialReviewPending > 0 ? String(initialReviewPending) : null },
    { href: "/analytics", label: "Analytics", icon: BarChart3, badge: null },
    { href: "/settings", label: "Settings", icon: Settings, badge: null }
  ];

  return (
    <div className="crm-shell">
      {/* Sidebar Glass Panel */}
      <motion.aside 
        className="crm-sidebar" 
        aria-label="CRM navigation"
        initial={{ x: -250, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <a className="crm-brand" href="/pipeline" aria-label="AI Automation CRM home">
          <motion.span 
            className="crm-brand-mark"
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
          >
            <Fingerprint className="w-5 h-5" />
          </motion.span>
          <span>
            <strong>Outreach CRM</strong>
            <small>AI Automation</small>
          </span>
        </a>

        <nav className="crm-nav mt-4" aria-label="Primary">
          {navItems.map((item, idx) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <motion.a 
                className={active ? "active relative" : "relative"} 
                href={item.href} 
                key={item.href} 
                aria-current={active ? "page" : undefined}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 + 0.1, duration: 0.3 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {active && (
                  <motion.div 
                    layoutId="active-nav-bg"
                    className="absolute inset-0 bg-[var(--color-brand-subtle)] rounded-lg z-0"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="flex items-center gap-3 z-10 relative">
                  <item.icon className={`w-4 h-4 ${active ? 'text-white' : 'text-zinc-400'}`} />
                  <span className="font-medium">{item.label}</span>
                </span>
                {item.badge ? (
                  <span className="nav-badge z-10 relative" aria-label={`${item.label} count`}>
                    {item.badge}
                  </span>
                ) : null}
              </motion.a>
            );
          })}
        </nav>
      </motion.aside>

      <div className="crm-main flex flex-col h-screen overflow-hidden">
        {/* Topbar Glass Panel */}
        <motion.header 
          className="crm-topbar"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
        >
          <form className="global-search relative flex-1 max-w-xl group" role="search">
            <label className="sr-only" htmlFor="global-search">Search CRM</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-[var(--accent)] transition-colors" />
            <input 
              id="global-search" 
              name="q" 
              className="pl-10 bg-white/5 border border-white/10 rounded-xl focus:bg-white/10 focus:border-[var(--accent)] transition-all h-10 w-full text-sm placeholder-zinc-500 shadow-inner"
              placeholder="Search business, email, niche, city..." 
            />
          </form>

          <div className="topbar-actions ml-auto">
            <motion.button 
              className="global-pause flex items-center gap-2 font-medium" 
              type="button" 
              aria-pressed="false"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <PauseCircle className="w-4 h-4" />
              <span>Global Pause</span>
            </motion.button>
            <motion.button 
              className="notification-button relative" 
              type="button" 
              aria-label="Notifications"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Bell className="w-4 h-4 text-zinc-300" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-[var(--bg)]" />
            </motion.button>
            <motion.div 
              className="founder-chip font-medium border-white/10 cursor-pointer" 
              aria-label="Logged in founder"
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              {founderName}
            </motion.div>
          </div>
        </motion.header>

        {/* Scrollable Main Content */}
        <main className="crm-content flex-1 overflow-y-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
