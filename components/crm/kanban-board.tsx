"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Badge, bandTone } from "@/components/ui/badge";

type Column = { key: string; label: string };

export function KanbanBoard({ columns, leads }: Readonly<{ columns: Column[]; leads: any[] }>) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Spatial perspective effect linked to horizontal scroll
  const { scrollXProgress } = useScroll({ container: containerRef });
  const rotateY = useTransform(scrollXProgress, [0, 1], [3, -3]);

  return (
    <motion.section 
      ref={containerRef}
      className="flex gap-6 overflow-x-auto pb-8 pt-4 px-4 -mx-4 snap-x snap-mandatory"
      style={{ perspective: 1200 }}
    >
      {columns.map((column, i) => {
        const cards = leads.filter((row) => row.status === column.key);
        return (
          <motion.div 
            key={column.key}
            className="glass-panel min-w-[320px] max-w-[320px] flex flex-col gap-4 p-4 shrink-0 snap-center"
            initial={{ opacity: 0, x: 50, rotateY: 15 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ delay: i * 0.1, type: "spring", stiffness: 200, damping: 25 }}
            style={{ rotateY, transformStyle: "preserve-3d" }}
          >
            <div className="flex justify-between items-center mb-2 border-b border-white/5 pb-3">
              <h3 className="font-medium text-white/80">{column.label}</h3>
              <Badge tone="muted">{cards.length}</Badge>
            </div>
            
            <div className="flex flex-col gap-3 min-h-[60vh] pb-10">
              {cards.map((row, j) => (
                <motion.div 
                  key={row.id}
                  className="glass-card p-4 cursor-grab active:cursor-grabbing hover:border-brand/40 hover:bg-white/[0.03] transition-colors group relative overflow-hidden"
                  whileHover={{ scale: 1.02, y: -2, translateZ: 20 }}
                  whileTap={{ scale: 0.98, cursor: "grabbing" }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 + j * 0.02 }}
                >
                  {/* Subtle shine effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[100%] group-hover:animate-shine" />

                  <a href={`/pipeline/${row.id}`} className="block text-white/90 font-medium mb-1 group-hover:text-brand transition-colors">
                    {row.businessName}
                  </a>
                  <div className="text-sm text-white/40 mb-4">{row.niche ?? "No niche"}</div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <Badge tone={bandTone(row.effectiveBand)}>{row.effectiveBand ?? "NA"}</Badge>
                    <span className="font-mono text-xs text-white/60">{row.score ?? "--"}</span>
                  </div>
                  
                  <div className="text-xs text-white/30 truncate border-t border-white/5 pt-2 mt-2">
                    {row.campaignName ?? "No campaign"}
                  </div>
                </motion.div>
              ))}
              {cards.length === 0 && (
                <div className="h-24 border border-dashed border-white/10 rounded-xl flex items-center justify-center text-white/20 text-sm">
                  Drop leads here
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.section>
  );
}
