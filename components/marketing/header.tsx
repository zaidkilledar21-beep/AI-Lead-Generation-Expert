"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";

const NAV_LINKS = [
  { label: "Services", href: "#services" },
  { label: "Process", href: "#process" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
] as const;

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-10 h-[84px]">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5 no-underline">
          <span
            className="flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #32d8b9, #9ac9e2)" }}
          >
            S
          </span>
          <span className="font-['Inter'] text-[18px] font-semibold tracking-[-0.02em] text-white transition-colors duration-200 group-hover:text-[#9ac9e2]">
            synqro
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="font-['Inter'] text-[14px] font-medium text-[#ffffffb3] hover:text-white transition-colors duration-200 no-underline py-1.5 px-3"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="#assessment"
            className="inline-flex items-center justify-center h-10 px-5 rounded-full font-['Inter'] text-[13px] font-semibold text-[#01283c] no-underline transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #cbff97, #9ac9e2)",
            }}
          >
            Request Free Assessment
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex flex-col gap-1.5 p-2 cursor-pointer bg-transparent border-none"
          aria-label="Toggle navigation menu"
        >
          <span className={`block w-5 h-[2px] bg-white transition-transform duration-200 ${mobileOpen ? "translate-y-[5px] rotate-45" : ""}`} />
          <span className={`block w-5 h-[2px] bg-white transition-opacity duration-200 ${mobileOpen ? "opacity-0" : ""}`} />
          <span className={`block w-5 h-[2px] bg-white transition-transform duration-200 ${mobileOpen ? "-translate-y-[5px] -rotate-45" : ""}`} />
        </button>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-[#01283c]/95 backdrop-blur-xl border-t border-white/10 px-6 py-6 flex flex-col gap-4"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="font-['Inter'] text-[15px] font-medium text-white/80 hover:text-white no-underline py-2"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="#assessment"
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center justify-center h-10 px-5 rounded-full font-['Inter'] text-[13px] font-semibold text-[#01283c] no-underline mt-2"
            style={{ background: "linear-gradient(135deg, #cbff97, #9ac9e2)" }}
          >
            Request Free Assessment
          </Link>
        </motion.div>
      )}
    </motion.header>
  );
}
