"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Product, BeachMoment, BEACH_MOMENTS } from "@/data/products";
import {
  Eye,
  Plus,
  Check,
  Play,
  Pause,
  Zap,
  Waves,
  ShieldCheck,
  Truck,
  Film,
  RotateCw,
  RotateCcw,
  MapPin,
  Lock,
  Sparkles,
  ArrowUpRight,
  Compass
} from "lucide-react";

interface HeroShowcaseProps {
  products: Product[];
  beachMoments?: BeachMoment[];
  bundleDiscountPercent?: number;
  orbitSpeedMultiplier?: number;
  onQuickView: (product: Product) => void;
  onAddToCart: (product: Product, size: string) => void;
  onInstantBuy: (product: Product, size: string) => void;
  onBuyBothBundle: () => void;
}

export default function HeroShowcase({
  products,
  beachMoments = BEACH_MOMENTS,
  bundleDiscountPercent = 15,
  orbitSpeedMultiplier = 1,
  onQuickView,
  onAddToCart,
  onInstantBuy,
  onBuyBothBundle
}: HeroShowcaseProps) {
  const totalRawPrice = products.reduce((sum, p) => sum + p.price, 0);
  const bundlePrice = Math.round(
    totalRawPrice * (1 - bundleDiscountPercent / 100)
  );

  // Continuous 360° circular orbit is ALWAYS ON by default
  const [isOrbiting, setIsOrbiting] = useState(true);

  // Refs for 60/120fps hardware-accelerated requestAnimationFrame 360° rotation
  const stageRef = useRef<HTMLDivElement>(null);
  const stageWidthRef = useRef<number>(800);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const floorRingRef = useRef<HTMLDivElement>(null);
  const frontSetBadgeRef = useRef<HTMLSpanElement>(null);
  const lastFrontIndexRef = useRef<number>(-1);
  const angleRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const lastClientXRef = useState<number>(0)[0] ? useRef<number>(0) : useRef<number>(0);

  // Per-product inline size selection for 1-click easy buying
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [addedId, setAddedId] = useState<string | null>(null);

  // Measure stage width only on mount & resize (prevents layout thrashing inside rAF)
  useEffect(() => {
    const updateWidth = () => {
      if (stageRef.current) {
        stageWidthRef.current = stageRef.current.clientWidth || 800;
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth, { passive: true });
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Apply smooth, flicker-free 360° circular transforms on every frame
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const updatePositions = (now: number) => {
      const dt = Math.min(48, Math.max(0, now - lastTime));
      lastTime = now;

      if (isOrbiting && !isDraggingRef.current) {
        const speed = Math.max(0.2, Math.min(2, orbitSpeedMultiplier || 1));
        // Gentle, slow luxury gallery speed (~26 seconds per full 360° rotation)
        angleRef.current =
          (angleRef.current + dt * 0.00024 * speed) % (Math.PI * 2);
      }

      const stageWidth = stageWidthRef.current;
      const radiusX = Math.min(220, Math.max(120, stageWidth * 0.24));
      const radiusY = 26;
      const count = Math.max(1, products.length);

      let frontIndex = 0;
      let maxSin = -2;

      for (let i = 0; i < count; i++) {
        const el = itemRefs.current[i];
        if (!el) continue;

        const theta = angleRef.current + (i * Math.PI * 2) / count;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta); // +1 = front center, -1 = back center
        if (sinT > maxSin) {
          maxSin = sinT;
          frontIndex = i;
        }

        const x = cosT * radiusX;
        const y = sinT * radiusY;
        const depthNorm = (sinT + 1) * 0.5; // 0 (back) to 1 (front)
        const scale = 0.84 + depthNorm * 0.2;

        // Pure 2D+scale GPU-composited transform (avoids 3D plane Z-fighting & filter re-rasterization flicker)
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(
          2
        )}px, 0px) scale(${scale.toFixed(4)})`;
      }

      // Only update z-index & front badge DOM text when the leading item actually swaps
      if (frontIndex !== lastFrontIndexRef.current) {
        lastFrontIndexRef.current = frontIndex;
        for (let i = 0; i < count; i++) {
          const el = itemRefs.current[i];
          if (el) {
            el.style.zIndex = i === frontIndex ? "30" : "20";
          }
        }
        if (frontSetBadgeRef.current && products[frontIndex]) {
          frontSetBadgeRef.current.textContent = `FRONT STAGE: SET ${products[frontIndex].number}`;
        }
      }

      const degrees = ((angleRef.current * 180) / Math.PI) % 360;
      const normalizedDeg = (degrees + 360) % 360;

      if (floorRingRef.current) {
        floorRingRef.current.style.transform = `rotate3d(0, 0, 1, ${normalizedDeg.toFixed(2)}deg)`;
      }

      animationFrameId = requestAnimationFrame(updatePositions);
    };

    animationFrameId = requestAnimationFrame(updatePositions);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isOrbiting, orbitSpeedMultiplier, products]);

  // Interactive Pointer Drag so user can also manually spin 360°
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    lastClientXRef.current = e.clientX;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastClientXRef.current;
    lastClientXRef.current = e.clientX;
    angleRef.current = (angleRef.current + deltaX * 0.005) % (Math.PI * 2);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const nudgeOrbitAngle = (deltaRadians: number) => {
    angleRef.current =
      (angleRef.current + deltaRadians + Math.PI * 2) % (Math.PI * 2);
  };

  const handleSizeSelect = (productId: string, size: string) => {
    setSelectedSizes((prev) => ({ ...prev, [productId]: size }));
  };

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const size =
      selectedSizes[product.id] ||
      product.sizes?.[0]?.size ||
      "FREE SIZE (Adjustable Tie)";
    onAddToCart(product, size);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1800);
  };

  const handleDirectBuy = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const size =
      selectedSizes[product.id] ||
      product.sizes?.[0]?.size ||
      "FREE SIZE (Adjustable Tie)";
    onInstantBuy(product, size);
  };

  return (
    <section
      aria-label="Beachwear 360-Degree Showcase & Instant Prepaid Buy"
      className="relative flex-1 w-full flex flex-col justify-between items-center px-3 sm:px-6 md:px-10 py-3 md:py-5 select-none overflow-hidden"
    >
      {/* =====================================================================
          ARCHITECTURAL 360° COASTAL ATELIER PAVILION (HERO SHOWCASE STAGE)
         ===================================================================== */}
      <div
        style={{
          background:
            "radial-gradient(circle at 50% 42%, #ffffff 0%, #fafafa 58%, #f4f4f5 100%)",
          boxShadow:
            "0 24px 60px -15px rgba(0, 0, 0, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 1)"
        }}
        className="relative w-full max-w-6xl mx-auto rounded-[2rem] border border-black/10 overflow-hidden mb-8 p-4 sm:p-6 lg:p-7"
      >
        {/* Subtle Architectural Grid & Warm Sunbeams Overlay */}
        <div
          aria-hidden="true"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(120, 53, 15, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(120, 53, 15, 0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px"
          }}
          className="absolute inset-0 pointer-events-none"
        />

        {/* Monumental Editorial Background Watermark */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden"
        >
          <span
            style={{ fontSize: "clamp(3.5rem, 11vw, 9.5rem)", lineHeight: 0.85 }}
            className="font-black tracking-[-0.05em] uppercase text-amber-950/[0.045]"
          >
            APOORVA
          </span>
          <span className="font-mono text-[10px] sm:text-xs tracking-[0.55em] uppercase text-amber-950/15 mt-2">
            ALUVA • KERALA • 360° ATELIER
          </span>
        </div>

        {/* Top Stage Telemetry & Editorial Header Strip */}
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-amber-950/10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141414] text-[#faf8f5] text-[10px] font-mono uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>360° INTERACTIVE TURNTABLE</span>
            <span className="text-amber-300 font-bold">• ALUVA, KERALA</span>
          </div>

          <p
            style={{ textWrap: "balance" }}
            className="hidden md:block font-mono text-[11px] uppercase tracking-[0.22em] text-amber-950/80 font-bold text-center"
          >
            HAND-POLISHED KERALA COCONUT SHELLS • COIR FRINGE &amp; FINE JUTE WRAPS
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/85 border border-amber-950/15 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-950 shadow-2xs">
            <Lock className="w-3 h-3 text-emerald-700" />
            <span>100% Prepaid via Razorpay • Free Air Shipping</span>
          </div>
        </div>

        {/* Full-Width Center Stage: 360° Trigonometric Turntable Pavilion (No Side Cards) */}
        <div
          ref={stageRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ height: "365px", position: "relative" }}
          className="relative z-20 w-full flex items-center justify-center my-3 cursor-grab active:cursor-grabbing"
        >
          {/* Central Golden-Hour Sun Arch & Compass Halo Behind Orbiting Cutouts */}
          <div
            aria-hidden="true"
            style={{
              width: "320px",
              height: "320px",
              background:
                "radial-gradient(circle, rgba(251, 191, 36, 0.22) 0%, rgba(217, 119, 6, 0.08) 55%, transparent 75%)"
            }}
            className="absolute rounded-full border border-amber-900/15 flex items-center justify-center pointer-events-none"
          >
            <div
              style={{ width: "235px", height: "235px" }}
              className="rounded-full border border-dashed border-amber-900/20 flex items-center justify-center"
            >
              <div
                style={{ width: "140px", height: "140px" }}
                className="rounded-full border border-amber-900/10"
              />
            </div>
          </div>

          {/* 2D-Projected Rotating Compass Pedestal Ring on the Stage Floor (Zero 3D Z-Fighting) */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "50%",
              top: "68%",
              width: "540px",
              height: "540px",
              transform: "translate(-50%, -50%) scaleY(0.26)",
              pointerEvents: "none",
              zIndex: 1
            }}
            className="hidden sm:flex items-center justify-center"
          >
            <div
              ref={floorRingRef}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "9999px",
                border: "2px dashed rgba(120, 53, 15, 0.28)",
                background:
                  "radial-gradient(circle, rgba(180, 130, 70, 0.1) 0%, rgba(120, 53, 15, 0.03) 60%, transparent 75%)",
                willChange: "transform",
                backfaceVisibility: "hidden"
              }}
              className="flex items-center justify-center relative"
            >
              <div
                style={{
                  width: "74%",
                  height: "74%",
                  borderRadius: "9999px",
                  border: "1.5px solid rgba(120, 53, 15, 0.16)"
                }}
              />
            </div>
          </div>

          {/* DYNAMICALLY ORBITING BEACHWEAR CUTOUTS (SUPPORTS 2, 3, 4+ PRODUCTS) */}
          {products.map((prod, idx) => {
            const activeSize =
              selectedSizes[prod.id] ||
              prod.sizes?.[0]?.size ||
              "FREE SIZE (Adjustable Tie)";
            return (
              <div
                key={prod.id}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                onClick={() => onInstantBuy(prod, activeSize)}
                style={{
                  position: "absolute",
                  width: "230px",
                  height: "285px",
                  transform: `translate3d(${idx % 2 === 0 ? 190 : -190
                    }px, 0px, 0px) scale(0.95)`,
                  willChange: "transform",
                  backfaceVisibility: "hidden",
                  zIndex: 30 - idx * 10
                }}
                className="flex flex-col items-center justify-center cursor-pointer group"
                title={`Click to Buy Set ${prod.number}: ${prod.name}`}
              >
                {/* Soft Warm Spotlight Halo Behind Cutout */}
                <div
                  aria-hidden="true"
                  style={{
                    width: "190px",
                    height: "220px",
                    background:
                      "radial-gradient(circle, rgba(255,255,255,0.75) 0%, rgba(251,191,36,0.12) 55%, transparent 75%)"
                  }}
                  className="absolute top-2 rounded-full pointer-events-none transition-transform duration-300 group-hover:scale-110"
                />

                {/* Cutout Image Container (Locked Proportion so never oversized) */}
                <div
                  style={{
                    width: "200px",
                    height: "225px",
                    maxWidth: "200px",
                    maxHeight: "225px",
                    position: "relative"
                  }}
                  className="flex items-center justify-center"
                >
                  <Image
                    src={prod.image}
                    alt={prod.name}
                    width={200}
                    height={225}
                    priority={idx < 2}
                    unoptimized
                    style={{
                      width: "200px",
                      height: "225px",
                      maxWidth: "200px",
                      maxHeight: "225px",
                      objectFit: "contain",
                      display: "block",
                      filter:
                        "drop-shadow(0 14px 18px rgba(28, 16, 6, 0.22))"
                    }}
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                {/* Floor Contact Shadow Under Cutout */}
                <div
                  aria-hidden="true"
                  style={{
                    width: "110px",
                    height: "12px",
                    background:
                      "radial-gradient(ellipse at center, rgba(28,16,6,0.24) 0%, transparent 75%)"
                  }}
                  className="-mt-1 mb-1 rounded-full pointer-events-none"
                />

                {/* Luxury Dark Espresso & Gold Floating Plinth Pill */}
                <div className="px-3.5 py-1.5 rounded-full bg-[#141414] text-[#faf8f5] border border-amber-400/35 shadow-lg flex items-center gap-2 whitespace-nowrap group-hover:bg-black group-hover:scale-105 transition-transform">
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-black text-[9px] font-mono font-black">
                    SET {prod.number}
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white">
                    {prod.shortName}
                  </span>
                  <span className="text-[11px] font-mono font-black text-amber-300">
                    ₹{prod.price.toLocaleString("en-IN")}
                  </span>
                  <ArrowUpRight className="w-3 h-3 text-amber-300 opacity-80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Interactive 360° Turntable Console & Bundle Action Dock */}
        <div className="relative z-30 pt-3 border-t border-amber-950/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Live Front Stage Telemetry + Drag Hint */}
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-amber-950/80">
            <Compass className="w-3.5 h-3.5 text-amber-800" />
            <span
              ref={frontSetBadgeRef}
              className="font-black text-amber-950 bg-amber-500/15 px-2.5 py-1 rounded-full border border-amber-900/15"
            >
              FRONT STAGE: SET 01
            </span>
            <span className="hidden xl:inline text-black/50">
              • Drag stage to spin 360°
            </span>
          </div>

          {/* Right: 1-Click Bundle Offer CTA */}
          <button
            type="button"
            onClick={onBuyBothBundle}
            style={{ backgroundColor: "#f59e0b", color: "#000000" }}
            className="px-4 py-1.5 rounded-full font-mono text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:opacity-95 transition-all active:scale-95"
          >
            <Sparkles className="w-3 h-3 fill-black" />
            <span>
              Buy Both ({bundleDiscountPercent}% Off • ₹
              {bundlePrice.toLocaleString("en-IN")})
            </span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          EASY 1-CLICK BUY DOCK + EMBEDDED PRODUCT MOTION VIDEOS
         ===================================================================== */}
      <div className="z-30 w-full max-w-6xl mx-auto mb-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 px-1">
          <div>
            <h2 className="text-sm sm:text-base font-black font-mono uppercase tracking-wider text-[#141414] flex items-center gap-2">
              <Waves className="w-4 h-4 text-amber-800" />
              <span>CHOOSE YOUR BEACHWEAR SET — 1-CLICK PREPAID BUY</span>
            </h2>
            <p className="text-[11px] font-mono text-black/60">
              Watch the live motion video for each piece and pay securely online via Razorpay (UPI, Cards, NetBanking).
            </p>
          </div>

          {/* Buy All Beach Sets Bundle Button */}
          <button
            type="button"
            onClick={onBuyBothBundle}
            style={{ backgroundColor: "#141414", color: "#faf8f5" }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-full hover:opacity-90 font-mono text-xs font-bold uppercase tracking-wider shadow-md transition-all active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span>
              BUY{" "}
              {products.length === 2
                ? "BOTH SETS"
                : `ALL ${products.length} SETS`}{" "}
              (SAVE {bundleDiscountPercent}% • ₹
              {bundlePrice.toLocaleString("en-IN")})
            </span>
          </button>
        </div>

        {/* Product Easy-Buy + Video Cards Grid */}
        <div
          className={`grid grid-cols-1 ${products.length >= 3
              ? "md:grid-cols-2 lg:grid-cols-3"
              : "md:grid-cols-2"
            } gap-5`}
        >
          {products.map((prod) => {
            const activeSize =
              selectedSizes[prod.id] ||
              prod.sizes?.[0]?.size ||
              "FREE SIZE (Adjustable Tie)";
            const isAdded = addedId === prod.id;

            return (
              <div
                key={prod.id}
                className="bg-white border border-black/15 rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all flex flex-col justify-between"
              >
                {/* Live Motion Video Header for Each Product */}
                <div
                  onClick={() => onQuickView(prod)}
                  style={{ height: "230px", position: "relative" }}
                  className="w-full bg-[#181512] overflow-hidden cursor-pointer group"
                >
                  <video
                    src={prod.video}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    className="group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />

                  {/* Top Badges over Video */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span
                      style={{
                        backgroundColor: "rgba(0,0,0,0.75)",
                        color: "#ffffff"
                      }}
                      className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full backdrop-blur-sm"
                    >
                      <Film className="w-3 h-3 text-amber-300" />
                      SET {prod.number} // LIVE VIDEO
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-950 bg-emerald-200 px-2.5 py-0.5 rounded-full">
                      ● IN STOCK
                    </span>
                  </div>

                  {/* Bottom Video Caption & Quick Inspect */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 pointer-events-none">
                    <p className="text-[10px] font-mono text-white/90 truncate">
                      {prod.videoCaption}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase bg-white/95 text-black font-bold px-2.5 py-1 rounded-full flex-shrink-0">
                      <Eye className="w-3 h-3" />
                      Specs
                    </span>
                  </div>
                </div>

                {/* Card Body: Product Title, Price, 1-Tap Size & 1-Click Buy */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          onClick={() => onQuickView(prod)}
                          style={{
                            width: "56px",
                            height: "56px",
                            flexShrink: 0
                          }}
                          className="rounded-xl bg-neutral-50 border border-black/10 overflow-hidden cursor-pointer flex items-center justify-center"
                        >
                          <Image
                            src={prod.image}
                            alt={prod.name}
                            width={48}
                            height={48}
                            unoptimized
                            style={{
                              width: "48px",
                              height: "48px",
                              maxWidth: "48px",
                              maxHeight: "48px",
                              objectFit: "contain",
                              display: "block"
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-mono font-black text-sm sm:text-base uppercase tracking-tight text-[#141414] leading-snug">
                            {prod.name}
                          </h3>
                          <p className="text-[11px] font-mono text-black/65 truncate mt-0.5">
                            {prod.material}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-mono font-black text-lg sm:text-xl text-black">
                          ₹{prod.price.toLocaleString("en-IN")}
                        </div>
                        {prod.originalPrice ? (
                          <div className="font-mono text-xs text-black/40 line-through">
                            ₹{prod.originalPrice.toLocaleString("en-IN")}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* 1-Tap Size Selector Pills */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase text-black/60 mb-1.5">
                        <span className="font-bold text-black">
                          SELECT FIT (ADJUSTABLE TIE CORDS)
                        </span>
                        <button
                          type="button"
                          onClick={() => onQuickView(prod)}
                          className="underline hover:text-black"
                        >
                          Cup &amp; Skirt Details
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {prod.sizes.map((s) => {
                          const selected = activeSize === s.size;
                          return (
                            <button
                              key={s.size}
                              type="button"
                              onClick={() => handleSizeSelect(prod.id, s.size)}
                              className={`py-2 px-2 rounded-xl font-mono text-[10px] uppercase transition-all border truncate ${selected
                                  ? "bg-black text-white border-black font-bold shadow-xs"
                                  : "bg-white hover:bg-black/5 text-black/80 border-black/15"
                                }`}
                            >
                              {s.size.replace(" (Adjustable Tie)", "")}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 1-Click Buy Now + Add to Bag */}
                  <div className="flex items-center gap-2 pt-3 border-t border-black/10">
                    <button
                      type="button"
                      onClick={(e) => handleDirectBuy(e, prod)}
                      className="flex-1 py-3.5 px-4 rounded-full bg-[#141414] hover:bg-black text-[#faf8f5] font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md hover:shadow-xl transition-all active:scale-95"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                      <span>
                        1-CLICK BUY NOW — ₹{prod.price.toLocaleString("en-IN")}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleQuickAdd(e, prod)}
                      className={`py-3.5 px-4 rounded-full font-mono text-xs font-bold uppercase tracking-wider border flex items-center gap-1 transition-all ${isAdded
                          ? "bg-emerald-700 border-emerald-700 text-white"
                          : "bg-white hover:bg-black/5 border-black/20 text-black"
                        }`}
                      title="Add to Shopping Bag"
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>ADDED</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>BAG</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          BEACHWEAR MOMENTS LOOKBOOK (THE 4 UPLOADED LIFESTYLE PHOTOS)
         ===================================================================== */}
      <div className="z-20 w-full max-w-6xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-3 px-1">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-900 font-bold">
              BEACHWEAR LOOKBOOK // SUNSET TO BONFIRE
            </span>
            <h3 className="text-base sm:text-lg font-black font-mono uppercase tracking-tight text-[#141414]">
              SHORELINE, INFINITY POOL &amp; ISLAND NIGHTS
            </h3>
          </div>
          <span className="text-[11px] font-mono text-black/60">
            Tap any look to buy immediately via Razorpay
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {beachMoments.map((moment) => {
            const matchedProduct =
              products.find((p) => p.id === moment.productId) || products[0];
            return (
              <div
                key={moment.id}
                onClick={() =>
                  onInstantBuy(
                    matchedProduct,
                    selectedSizes[matchedProduct.id] ||
                    "FREE SIZE (Adjustable Tie)"
                  )
                }
                style={{ height: "320px", position: "relative" }}
                className="group rounded-3xl overflow-hidden bg-[#1a1612] border border-black/15 shadow-md hover:shadow-xl cursor-pointer flex flex-col justify-end"
              >
                <Image
                  src={moment.image}
                  alt={moment.title}
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  style={{ objectFit: "cover" }}
                  className="group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                <div className="relative z-10 p-4 text-white font-mono">
                  <span
                    style={{ backgroundColor: "#fbbf24", color: "#000000" }}
                    className="inline-block text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full mb-1.5"
                  >
                    {moment.occasion}
                  </span>
                  <h4 className="text-xs font-bold uppercase tracking-wide leading-snug">
                    {moment.title}
                  </h4>
                  <p className="text-[10px] text-white/75 mb-2.5">
                    {moment.subtitle}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInstantBuy(
                        matchedProduct,
                        selectedSizes[matchedProduct.id] ||
                        "FREE SIZE (Adjustable Tie)"
                      );
                    }}
                    style={{ backgroundColor: "#ffffff", color: "#000000" }}
                    className="w-full py-2 px-3 rounded-full font-mono text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-colors"
                  >
                    <Zap className="w-3 h-3 fill-black" />
                    <span>
                      BUY THIS LOOK — ₹
                      {matchedProduct.price.toLocaleString("en-IN")}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          FOOTER TRUST BAR + LEGAL, POLICY & COMPLIANCE LINKS (ALUVA, KERALA)
         ===================================================================== */}
      <footer className="w-full max-w-6xl mx-auto pt-5 border-t border-black/12 z-20 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-black/75">
            <span className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-800" />
              100% Cotton-Lined Shells
            </span>
            <span className="flex items-center gap-1.5 font-semibold">
              <Truck className="w-4 h-4 text-amber-900" />
              Free Express Dispatch from Aluva, Kerala
            </span>
            <span className="flex items-center gap-1.5 font-semibold">
              <Lock className="w-3.5 h-3.5 text-emerald-800" />
              100% Prepaid Online via Razorpay (No COD)
            </span>
          </div>

          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-black/60 flex items-center gap-1 font-bold">
            <MapPin className="w-3.5 h-3.5 text-amber-800" />
            <span>APOORVA™ ATELIER • ALUVA, ERNAKULAM, KERALA — 683101</span>
          </span>
        </div>

        {/* Necessary Legal, Brand & Compliance Page Links */}
        <div className="pt-3 border-t border-black/8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-black/65">
          <nav
            aria-label="Legal and Store Policies"
            className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5"
          >
            <Link
              href="/about"
              className="hover:text-black underline-offset-4 hover:underline font-bold"
            >
              About Us
            </Link>
            <Link
              href="/terms"
              className="hover:text-black underline-offset-4 hover:underline"
            >
              Terms &amp; Conditions
            </Link>
            <Link
              href="/privacy"
              className="hover:text-black underline-offset-4 hover:underline"
            >
              Privacy Policy
            </Link>
            <Link
              href="/refund"
              className="hover:text-black underline-offset-4 hover:underline"
            >
              Refund &amp; Cancellation Policy
            </Link>
            <Link
              href="/shipping"
              className="hover:text-black underline-offset-4 hover:underline"
            >
              Shipping &amp; Delivery Policy
            </Link>
            <Link
              href="/contact"
              className="hover:text-black underline-offset-4 hover:underline"
            >
              Contact Us (Aluva, Kerala)
            </Link>
            <Link
              href="/track"
              className="hover:text-black underline-offset-4 hover:underline"
            >
              Track Order
            </Link>
            <Link
              href="/admin"
              className="hover:text-amber-900 underline-offset-4 hover:underline font-bold"
            >
              Admin Studio
            </Link>
          </nav>

          <span className="text-[10px] text-black/45">
            © {new Date().getFullYear()} APOORVA Coastal Artisanal Collective
          </span>
        </div>
      </footer>
    </section>
  );
}
