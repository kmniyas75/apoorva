"use client";

import React, { useState } from "react";
import { Search, ShoppingBag, X, Mail, Truck, Zap } from "lucide-react";
import ApoorvaLogo from "./ApoorvaLogo";

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenFastBuy?: () => void;
  onOpenNotifications?: () => void;
  onOpenTracking?: () => void;
  onSearchSelect?: (query: string) => void;
  activeCapsule: string;
}

export default function Header({
  cartCount,
  onOpenCart,
  onOpenFastBuy,
  onOpenNotifications,
  onOpenTracking,
  onSearchSelect,
  activeCapsule
}: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearchSelect) {
      onSearchSelect(searchQuery.trim());
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <header className="relative z-30 w-full px-4 sm:px-6 md:px-12 py-4 flex items-center justify-between text-[#111111] border-b border-black/[0.08] bg-white/95 backdrop-blur-md">
      {/* APOORVA Brand Crest & Wordmark Left */}
      <a
        href="#"
        className="transition-opacity hover:opacity-85"
        aria-label="APOORVA Coastal Beachwear Home"
      >
        <ApoorvaLogo size="md" showTagline={true} />
      </a>

      {/* Actions Right (No AI button) */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Instant 1-Click Fast Buy Button */}
        {onOpenFastBuy && (
          <button
            type="button"
            onClick={onOpenFastBuy}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black px-3.5 py-1.5 rounded-full transition-all duration-200 shadow-sm hover:shadow active:scale-95 font-mono text-[11px] font-black uppercase tracking-wider"
            title="Open 1-Step Express Beachwear Checkout"
          >
            <Zap className="w-3.5 h-3.5 fill-black" />
            <span>FAST BUY</span>
          </button>
        )}

        {/* Live Courier & Transit Tracking Button */}
        {onOpenTracking && (
          <button
            type="button"
            onClick={onOpenTracking}
            className="hidden md:flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[#333333] hover:text-black transition-colors px-2.5 py-1.5 rounded-full border border-black/10 hover:border-black/30"
            title="Track Order & Shipment"
          >
            <Truck className="w-3.5 h-3.5 text-amber-900" />
            <span className="text-[11px] font-medium">TRACK</span>
          </button>
        )}

        {/* Email Notification System / Dispatch Desk Button */}
        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            className="hidden lg:flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[#333333] hover:text-black transition-colors px-2.5 py-1.5 rounded-full border border-black/10 hover:border-black/30"
            title="Open Email Notification Desk"
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">DISPATCH</span>
          </button>
        )}

        {/* Shopping Cart Bag Button */}
        <button
          type="button"
          onClick={onOpenCart}
          className="relative flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[#111111] hover:opacity-75 transition-opacity px-2.5 py-1.5 rounded-full border border-black/15 hover:border-black/30 bg-white/60"
          title="Open Shopping Bag"
        >
          <ShoppingBag className="w-4 h-4 stroke-[1.75]" />
          <span className="hidden sm:inline text-[11px] font-bold">BAG</span>
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-[#111111] rounded-full">
            {cartCount}
          </span>
        </button>
      </div>
    </header>
  );
}
