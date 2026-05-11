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
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-6 left-1/2 z-50 w-full max-w-5xl -translate-x-1/2 px-4"
      >
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/12 bg-black/72 p-4 shadow-2xl shadow-brand/10 backdrop-blur-2xl">
          {children}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
