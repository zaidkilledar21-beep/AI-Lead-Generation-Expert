"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState, useEffect } from "react";

/* ─── Ordina-inspired colour tokens ─── */
const C = {
  bg:       "#01283c",
  bgDeep:   "#011e2e",
  surface:  "#083247",
  border:   "rgba(255,255,255,0.08)",
  borderLt: "rgba(255,255,255,0.12)",
  text:     "#ffffff",
  textSoft: "#ffffffb3",
  textMuted:"#9ac9e2",
  accent:   "#32d8b9",
  lime:     "#cbff97",
  teal:     "#9ac9e2",
  link:     "#006092",
};

/* ─── Stagger animation presets ─── */
const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } } },
  item: { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } },
};

/* ─── Dashboard mockup data ─── */
const METRICS = [
  { label: "Active workflows", value: "24", delta: "+3 this week", color: C.accent },
  { label: "Avg. response time", value: "4.2m", delta: "↓ 38% faster", color: C.lime },
  { label: "Visibility score", value: "96%", delta: "↑ from 41%", color: C.teal },
];

const ACTIVITY_FEED = [
  { time: "2m ago", text: "Lead context updated across systems", tag: "Synced", tagColor: C.accent },
  { time: "8m ago", text: "Response prepared for human review", tag: "Ready", tagColor: C.lime },
  { time: "14m ago", text: "Next action assigned with context", tag: "Routed", tagColor: C.teal },
  { time: "22m ago", text: "KPI view refreshed from source data", tag: "Updated", tagColor: "#9ac9e2" },
];

export function Hero() {
  const prefersReducedMotion = useReducedMotion();
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = setInterval(() => setActiveIdx((p) => (p + 1) % ACTIVITY_FEED.length), 3200);
    return () => clearInterval(id);
  }, [prefersReducedMotion]);

  return (
    <section
      className="relative min-h-screen flex flex-col items-center overflow-hidden"
      style={{ background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bgDeep} 60%, #010f18 100%)` }}
    >
      {/* ── Subtle grid overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* ── Ambient glow ── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full pointer-events-none opacity-30 blur-[160px]"
        style={{ background: `radial-gradient(ellipse, ${C.accent}33 0%, transparent 70%)` }}
      />

      {/* ── Content wrapper ── */}
      <motion.div
        variants={stagger.container}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-[1280px] mx-auto px-6 sm:px-10 pt-36 sm:pt-44 pb-20 flex flex-col items-center"
      >
        {/* Eyebrow badge */}
        <motion.div variants={stagger.item} className="mb-8">
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-['Inter'] text-[12px] font-medium tracking-wide"
            style={{
              color: C.accent,
              background: "rgba(50,216,185,0.08)",
              border: `1px solid rgba(50,216,185,0.18)`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.accent }} />
            Connected Workflow Infrastructure
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={stagger.item}
          className="font-['Inter'] text-center text-[clamp(2.2rem,5.5vw,4.5rem)] font-semibold leading-[1.08] tracking-[-0.03em] max-w-[900px] mb-7"
          style={{ color: C.text }}
        >
          The workspace for clear,{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: `linear-gradient(135deg, ${C.lime}, ${C.accent})` }}
          >
            connected
          </span>{" "}
          workflows.
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          variants={stagger.item}
          className="font-['Inter'] text-center text-[clamp(1rem,1.8vw,1.25rem)] leading-[1.6] max-w-[640px] mb-12"
          style={{ color: C.textSoft }}
        >
          Synqro connects your existing channels, automates repetitive actions, and gives your business complete operational visibility — without replacing the tools you already trust.
        </motion.p>

        {/* CTA row */}
        <motion.div variants={stagger.item} className="flex flex-col sm:flex-row items-center gap-4 mb-20">
          <a
            href="#assessment"
            className="inline-flex items-center justify-center h-12 px-7 rounded-full font-['Inter'] text-[14px] font-semibold tracking-[-0.01em] no-underline transition-all duration-200 hover:opacity-90 active:scale-[0.97]"
            style={{ color: C.bgDeep, background: `linear-gradient(135deg, ${C.lime}, ${C.accent})` }}
          >
            Request Free Assessment
            <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2">
              <path d="M3.5 8h9M8.5 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <a
            href="#process"
            className="inline-flex items-center justify-center h-12 px-7 rounded-full font-['Inter'] text-[14px] font-medium tracking-[-0.01em] no-underline transition-all duration-200 hover:bg-white/10"
            style={{ color: C.textSoft, border: `1px solid ${C.border}` }}
          >
            See How It Works
          </a>
        </motion.div>

        {/* ═══════════════════════════════════════════
            PRODUCT DASHBOARD MOCKUP  (Ordina-style)
            ═══════════════════════════════════════════ */}
        <motion.div
          variants={stagger.item}
          className="w-full max-w-[1100px] rounded-2xl overflow-hidden"
          style={{
            border: `1px solid ${C.borderLt}`,
            background: `linear-gradient(180deg, rgba(8,50,71,0.6) 0%, rgba(1,30,46,0.8) 100%)`,
            boxShadow: "0 40px 80px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
          }}
        >
          {/* ── Window chrome ── */}
          <div
            className="flex items-center justify-between h-11 px-5"
            style={{ borderBottom: `1px solid ${C.border}`, background: "rgba(1,40,60,0.5)" }}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <span className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            <div
              className="h-6 px-4 rounded-md flex items-center font-['Inter'] text-[11px]"
              style={{ color: C.textMuted, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}` }}
            >
              synqro.app/workspace
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.accent }} />
              <span className="font-['Inter'] text-[10px] font-medium" style={{ color: C.accent }}>Live</span>
            </div>
          </div>

          {/* ── Dashboard body ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-0">

            {/* LEFT: Metrics + mini-chart */}
            <div className="p-6 sm:p-8 flex flex-col gap-5" style={{ borderRight: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-['Inter'] text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: C.textMuted }}>
                  Overview
                </span>
              </div>

              {/* Metric cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
                {METRICS.map((m, i) => (
                  <motion.div
                    key={m.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + i * 0.12, duration: 0.5 }}
                    className="rounded-xl p-4"
                    style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}
                  >
                    <div className="font-['Inter'] text-[11px] font-medium mb-2" style={{ color: C.textMuted }}>
                      {m.label}
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="font-['Inter'] text-[28px] font-semibold tracking-[-0.03em]" style={{ color: C.text }}>
                        {m.value}
                      </span>
                      <span className="font-['Inter'] text-[11px] font-medium" style={{ color: m.color }}>
                        {m.delta}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Mini sparkline placeholder */}
              <div className="rounded-xl p-4 mt-auto" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}>
                <div className="font-['Inter'] text-[11px] font-medium mb-3" style={{ color: C.textMuted }}>
                  Weekly throughput
                </div>
                <div className="flex items-end gap-[6px] h-10">
                  {[35, 52, 41, 68, 55, 72, 88, 64, 91, 78, 95, 82].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: 1.2 + i * 0.05, duration: 0.4, ease: "easeOut" }}
                      className="flex-1 rounded-sm"
                      style={{
                        background: i >= 9
                          ? `linear-gradient(180deg, ${C.accent}, ${C.accent}66)`
                          : "rgba(255,255,255,0.08)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Activity feed */}
            <div className="p-6 sm:p-8 flex flex-col gap-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-['Inter'] text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: C.textMuted }}>
                  Recent activity
                </span>
                <span
                  className="font-['Inter'] text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{ color: C.accent, background: "rgba(50,216,185,0.08)", border: `1px solid rgba(50,216,185,0.15)` }}
                >
                  {ACTIVITY_FEED.length} events
                </span>
              </div>

              {/* Feed items */}
              <div className="flex flex-col gap-2.5">
                {ACTIVITY_FEED.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      borderColor: activeIdx === i ? "rgba(50,216,185,0.2)" : C.border,
                      background: activeIdx === i ? "rgba(50,216,185,0.04)" : "rgba(255,255,255,0.02)",
                    }}
                    transition={{ delay: 0.9 + i * 0.1, duration: 0.5 }}
                    className="rounded-xl p-4 flex items-start gap-4 transition-colors duration-500"
                    style={{ border: `1px solid ${C.border}` }}
                  >
                    {/* Vertical timeline dot */}
                    <div className="mt-1.5 flex flex-col items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 transition-all duration-500"
                        style={{
                          background: activeIdx === i ? item.tagColor : "rgba(255,255,255,0.15)",
                          boxShadow: activeIdx === i ? `0 0 8px ${item.tagColor}55` : "none",
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="font-['Inter'] text-[13px] font-medium" style={{ color: C.text }}>
                          {item.text}
                        </span>
                        <span
                          className="font-['Inter'] text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ color: item.tagColor, background: `${item.tagColor}15`, border: `1px solid ${item.tagColor}22` }}
                        >
                          {item.tag}
                        </span>
                      </div>
                      <span className="font-['Inter'] text-[11px]" style={{ color: C.textMuted }}>
                        {item.time}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Status footer */}
              <div
                className="mt-auto rounded-xl p-4 flex items-center justify-between"
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: C.accent }} />
                  <span className="font-['Inter'] text-[12px] font-medium" style={{ color: C.textSoft }}>
                    All systems connected
                  </span>
                </div>
                <span className="font-['Inter'] text-[12px] font-semibold" style={{ color: C.accent }}>
                  100% visibility
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Trusted-by strip ── */}
        <motion.div
          variants={stagger.item}
          className="mt-20 flex flex-col items-center gap-6"
        >
          <span className="font-['Inter'] text-[12px] font-medium tracking-[0.06em] uppercase" style={{ color: C.textMuted }}>
            Built for modern B2B teams
          </span>
          <div className="flex items-center gap-10 flex-wrap justify-center">
            {["Operations", "Sales", "Finance", "HR", "Marketing"].map((dept) => (
              <span
                key={dept}
                className="font-['Inter'] text-[14px] font-medium tracking-[-0.01em]"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                {dept}
              </span>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
