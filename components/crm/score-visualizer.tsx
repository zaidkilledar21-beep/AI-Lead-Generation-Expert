"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function ScoreVisualizer({ score, band }: Readonly<{ score: number; band: string | null }>) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const percentage = Math.min(100, Math.max(0, score));
  const circleRadius = 38;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let colorClass = "text-white/25";
  
  if (band === "A") {
    colorClass = "text-emerald-400";
  } else if (band === "B") {
    colorClass = "text-blue-400";
  } else if (band === "C") {
    colorClass = "text-amber-400";
  } else if (band === "D") {
    colorClass = "text-rose-400";
  }

  return (
    <div className="relative flex items-center justify-center w-36 h-36 group">
      <div className="absolute inset-3 rounded-full border border-white/6 bg-white/[0.02]" />
      
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={circleRadius}
          className="fill-none stroke-white/8"
          strokeWidth="6"
        />
        <motion.circle
          cx="50"
          cy="50"
          r={circleRadius}
          className={`fill-none ${colorClass}`}
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={mounted ? { strokeDashoffset } : { strokeDashoffset: circumference }}
          transition={{ duration: 2, ease: "easeOut", type: "spring", bounce: 0.15 }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold text-white/92 tracking-tight">
          {score}
        </span>
        <span className="text-[10px] font-mono text-white/45 uppercase tracking-widest mt-1">
          Score
        </span>
      </div>
    </div>
  );
}
