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

  let colorClass = "text-white/20";
  let bgClass = "bg-white/20";
  
  if (band === "A") {
    colorClass = "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]";
    bgClass = "bg-emerald-400";
  } else if (band === "B") {
    colorClass = "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]";
    bgClass = "bg-blue-400";
  } else if (band === "C") {
    colorClass = "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]";
    bgClass = "bg-yellow-400";
  } else if (band === "D") {
    colorClass = "text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]";
    bgClass = "bg-red-400";
  }

  return (
    <div className="relative flex items-center justify-center w-36 h-36 group">
      {/* Background Glow */}
      <div className={`absolute inset-0 rounded-full blur-2xl opacity-10 transition-all duration-700 group-hover:opacity-30 ${bgClass}`} />
      
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Background Track */}
        <circle
          cx="50"
          cy="50"
          r={circleRadius}
          className="fill-none stroke-white/5"
          strokeWidth="6"
        />
        {/* Animated Progress */}
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
        <span className="text-4xl font-light text-white/90 tracking-tighter">
          {score}
        </span>
        <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest mt-1">
          Score
        </span>
      </div>
    </div>
  );
}
