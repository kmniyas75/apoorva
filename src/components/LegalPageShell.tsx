import React from "react";
import Link from "next/link";
import ApoorvaLogo from "./ApoorvaLogo";
import { ArrowLeft, ShieldCheck, MapPin, Mail, Phone, Lock } from "lucide-react";

interface LegalPageShellProps {
  title: string;
  subtitle: string;
  activePath:
    | "/about"
    | "/terms"
    | "/privacy"
    | "/refund"
    | "/shipping"
    | "/contact";
  lastUpdated?: string;
  children: React.ReactNode;
}

const LEGAL_LINKS = [
  { href: "/about", label: "About Us" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund", label: "Refund & Cancellation" },
  { href: "/shipping", label: "Shipping & Delivery" },
  { href: "/contact", label: "Contact Us" }
] as const;

export default function LegalPageShell({
  title,
  subtitle,
  activePath,
  lastUpdated = "October 30, 2026",
  children
}: LegalPageShellProps) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#e8e4dc] text-[#141414]">
      {/* Top Header */}
      <header className="w-full px-4 sm:px-8 md:px-14 py-4 border-b border-black/10 bg-[#e8e4dc]/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="hover:opacity-85 transition-opacity">
          <ApoorvaLogo size="md" showTagline={true} />
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/track"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-black/15 hover:border-black/40 font-mono text-xs uppercase tracking-wider text-black"
          >
            <span>Track Order</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#141414] text-[#faf8f5] hover:opacity-90 font-mono text-xs font-bold uppercase tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
            <span>Back to Storefront</span>
          </Link>
        </div>
      </header>

      {/* Sub-navigation Pill Strip for All Policy Pages */}
      <div className="w-full bg-[#dfd9ce] border-b border-black/10 px-4 sm:px-8 md:px-14 py-2.5">
        <nav
          aria-label="Store Legal and Information Pages"
          className="max-w-5xl mx-auto flex items-center gap-2 overflow-x-auto py-0.5"
        >
          {LEGAL_LINKS.map((item) => {
            const isActive = item.href === activePath;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3.5 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#141414] text-white font-bold shadow-xs"
                    : "bg-white/70 hover:bg-white text-black/80"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="bg-[#f7f3ec] border border-black/15 rounded-3xl p-6 sm:p-10 shadow-md space-y-6">
          <div className="border-b border-black/10 pb-5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-amber-900 font-bold">
                APOORVA COASTAL ATELIER • ALUVA, KERALA
              </span>
              <span className="text-[10px] font-mono text-black/50">
                Last Updated: {lastUpdated}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-mono uppercase tracking-tight text-[#141414]">
              {title}
            </h1>
            <p className="text-xs sm:text-sm font-mono text-black/70">
              {subtitle}
            </p>
          </div>

          <div className="font-mono text-xs sm:text-sm leading-relaxed text-black/80 space-y-5">
            {children}
          </div>

          {/* Registered Atelier Address Card */}
          <div className="mt-8 pt-6 border-t border-black/10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono bg-[#ede6da] p-5 rounded-2xl border border-black/10">
            <div className="space-y-1">
              <div className="font-black text-black uppercase flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-900" />
                <span>Registered Atelier</span>
              </div>
              <p className="text-[11px] text-black/75">
                APOORVA Coastal Atelier
                <br />
                Periyar River Road, Aluva
                <br />
                Ernakulam, Kerala — 683101, India
              </p>
            </div>

            <div className="space-y-1">
              <div className="font-black text-black uppercase flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-900" />
                <span>Concierge &amp; Support</span>
              </div>
              <p className="text-[11px] text-black/75">
                Email: concierge@apoorva.luxury
                <br />
                Phone / WhatsApp: +91 98470 89421
                <br />
                Hours: Mon–Sat, 9:30 AM – 6:30 PM IST
              </p>
            </div>

            <div className="space-y-1">
              <div className="font-black text-black uppercase flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-800" />
                <span>Payment &amp; Compliance</span>
              </div>
              <p className="text-[11px] text-black/75">
                100% Prepaid Online Orders
                <br />
                Secured by Razorpay PCI-DSS
                <br />
                GST State Code: 32 (Kerala)
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Shared Footer */}
      <footer className="w-full border-t border-black/10 bg-[#dfd9ce] px-4 sm:px-8 md:px-14 py-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-black/70">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-800" />
            <span>
              © {new Date().getFullYear()} APOORVA™ Coastal Atelier, Aluva,
              Kerala. All rights reserved.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="hover:text-black underline-offset-4 hover:underline"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

