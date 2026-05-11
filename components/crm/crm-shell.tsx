"use client";

import { usePathname } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Megaphone, Inbox, CheckSquare, BarChart3, Settings, Search, Bell, PauseCircle, Fingerprint, PlayCircle, ShieldCheck, ArrowUpRight, Sparkles } from "lucide-react";
import { useCrmRealtime } from "@/lib/hooks/use-crm-realtime";
import { toggleGlobalPauseAction } from "@/lib/crm/actions";

interface CrmShellProps {
  children: React.ReactNode;
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
  const [isPending, startTransition] = useTransition();
  const [optimisticPaused, setOptimisticPaused] = useOptimistic(
    initialGlobalPaused,
    (state, newPausedState: boolean) => newPausedState
  );

  // Sync badges using the realtime hook
  useCrmRealtime();

  const handleTogglePause = () => {
    startTransition(async () => {
      setOptimisticPaused(!optimisticPaused);
      try {
        await toggleGlobalPauseAction();
      } catch (error) {
        // Optimistic state will revert when the layout data is refetched
        console.error("Failed to toggle pause", error);
      }
    });
  };

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
  const currentNav = navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? navItems[0];
  const operationalState = optimisticPaused ? "Paused" : "Live";
  const operationalDetail = optimisticPaused ? "All outbound outreach is paused." : "Outbound outreach and automations are active.";

  return (
    <div className="crm-shell relative">
      <AnimatePresence>
        {optimisticPaused && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-50 border-4 border-red-500/35 mix-blend-screen"
            style={{ 
              boxShadow: "inset 0 0 120px rgba(239, 68, 68, 0.16)",
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
            }}
          />
        )}
      </AnimatePresence>

      <motion.aside 
        className="crm-sidebar" 
        aria-label="CRM navigation"
        initial={{ x: -250, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="crm-sidebar-card">
          <a className="crm-brand" href="/pipeline" aria-label="AI Automation CRM home">
            <motion.span 
              className="crm-brand-mark"
              whileHover={{ rotate: 180, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 200, damping: 12 }}
            >
              <Fingerprint className="w-5 h-5" />
            </motion.span>
            <span>
              <strong>Outreach CRM</strong>
              <small>AI Automation control center</small>
            </span>
          </a>

          <div className="crm-sidebar-insight">
            <div className="crm-sidebar-insight-header">
              <span className="crm-shell-eyebrow">Workspace</span>
              <span className={`crm-state-pill ${optimisticPaused ? "is-paused" : "is-live"}`}>
                <ShieldCheck className="h-3.5 w-3.5" />
                {operationalState}
              </span>
            </div>
            <p>{operationalDetail}</p>
            <div className="crm-sidebar-insight-grid">
              <div className="crm-sidebar-stat">
                <strong>{initialInboxUnhandled}</strong>
                <span>Inbox</span>
              </div>
              <div className="crm-sidebar-stat">
                <strong>{initialReviewPending}</strong>
                <span>Review</span>
              </div>
            </div>
          </div>
        </div>

        <div className="crm-sidebar-nav-group">
          <div className="crm-sidebar-heading">Primary navigation</div>
          <nav className="crm-nav" aria-label="Primary">
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
                <span className="flex items-center gap-3 z-10 relative min-w-0">
                  <span className={`crm-nav-icon ${active ? "is-active" : ""}`}>
                    <item.icon className="w-4 h-4" />
                  </span>
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
        </div>

        <div className="crm-sidebar-card crm-sidebar-footer">
          <div className="crm-shell-eyebrow">Session</div>
          <div className="crm-sidebar-footer-row">
            <div>
              <strong>{founderName}</strong>
              <span>Signed in founder</span>
            </div>
            <ArrowUpRight className="h-4 w-4 text-white/40" />
          </div>
          <div className="crm-sidebar-footer-note">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>Realtime sync active</span>
          </div>
        </div>
      </motion.aside>

      <div className="crm-main flex flex-col h-screen overflow-hidden">
        <motion.header 
          className="crm-topbar relative z-40"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
        >
          <div className="crm-topbar-copy">
            <div className="crm-shell-eyebrow">Control center</div>
            <div className="crm-topbar-title">{currentNav.label}</div>
            <p>{operationalDetail}</p>
          </div>

          <form action="/pipeline" className="global-search relative group" role="search">
            <label className="sr-only" htmlFor="global-search">Search CRM</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-[var(--accent)] transition-colors" />
            <input 
              id="global-search" 
              name="q" 
              className="field pl-10"
              placeholder="Search leads, campaigns, inbox, cities..." 
            />
          </form>

          <div className="topbar-actions ml-auto">
            <motion.button 
              className={`global-pause flex items-center gap-2 font-medium ${optimisticPaused ? "is-paused" : "is-live"}`}
              type="button" 
              onClick={handleTogglePause}
              disabled={isPending}
              aria-pressed={optimisticPaused}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {optimisticPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
              <span>{optimisticPaused ? "Resume Outreach" : "Global Pause"}</span>
            </motion.button>
            <motion.a 
              className="notification-button relative border border-white/10 bg-white/5" 
              aria-label="View notifications"
              href="/settings/notifications"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bell className="w-4 h-4 text-zinc-300" />
            </motion.a>
            <motion.div 
              className="founder-chip font-medium border border-white/10 bg-white/5 cursor-pointer" 
              aria-label="Logged in founder"
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              {founderName}
            </motion.div>
          </div>
        </motion.header>

        <main className="crm-content flex-1 overflow-y-auto w-full relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
