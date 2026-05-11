"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

export function StickyBottomBar({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 250 }}
        className="fixed bottom-8 left-1/2 z-50 w-full max-w-4xl -translate-x-1/2 px-6"
      >
        <div className="flex items-center justify-between gap-6 rounded-[22px] border border-white/15 bg-black/60 p-3 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6),0_16px_32px_-8px_rgba(130,81,238,0.15)] backdrop-blur-3xl">
          {children}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
