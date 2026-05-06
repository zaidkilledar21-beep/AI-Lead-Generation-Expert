"use client";

import { usePathname } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Megaphone, Inbox, CheckSquare, BarChart3, Settings, Search, Bell, PauseCircle, Fingerprint, PlayCircle } from "lucide-react";
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

  return (
    <div className="crm-shell relative">
      <AnimatePresence>
        {optimisticPaused && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-50 border-4 border-red-500/50 mix-blend-screen"
            style={{ 
              boxShadow: "inset 0 0 50px rgba(239, 68, 68, 0.2)",
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
            }}
          />
        )}
      </AnimatePresence>

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
          className="crm-topbar relative z-40"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
        >
          <form action="/pipeline" className="global-search relative flex-1 max-w-xl group" role="search">
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
              className={`global-pause flex items-center gap-2 font-medium transition-colors ${optimisticPaused ? 'text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-1.5 rounded-md' : 'text-zinc-300 hover:text-white'}`}
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
              className="notification-button relative" 
              aria-label="View notifications"
              href="/settings/notifications"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bell className="w-4 h-4 text-zinc-300" />
            </motion.a>
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
        <main className="crm-content flex-1 overflow-y-auto w-full relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
