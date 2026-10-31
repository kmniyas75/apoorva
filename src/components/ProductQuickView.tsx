"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Product } from "@/data/products";
import {
  X,
  Check,
  ShoppingBag,
  Shield,
  Truck,
  Leaf,
  Scissors,
  CheckCircle2,
  Zap,
  Film
} from "lucide-react";

interface ProductQuickViewProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, size: string) => void;
  onInstantBuy?: (product: Product, size: string) => void;
}

export default function ProductQuickView({
  product,
  onClose,
  onAddToCart,
  onInstantBuy
}: ProductQuickViewProps) {
  const [selectedSize, setSelectedSize] = useState<string>("FREE SIZE (Adjustable Tie)");
  const [selectedCup, setSelectedCup] = useState<"style-a" | "style-b">("style-a");
  const [selectedSkirt, setSelectedSkirt] = useState<"skirt-1" | "skirt-2">("skirt-1");
  // -1 = Live Motion Video, 0..N = Gallery Images
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number>(-1);
  const [activeTab, setActiveTab] = useState<"cut-comparison" | "skirts" | "craft">("cut-comparison");
  const [added, setAdded] = useState(false);

  if (!product) return null;

  const gallery = product.gallery?.length
    ? product.gallery
    : [product.image, product.modelImage];
  const displayedImage =
    selectedPhotoIdx >= 0 ? gallery[selectedPhotoIdx] || product.image : product.image;

  const currentCup =
    product.cupStyles.find((c) => c.id === selectedCup) || product.cupStyles[0];
  const currentSkirt =
    product.skirtOptions.find((s) => s.id === selectedSkirt) ||
    product.skirtOptions[0];

  const handleAdd = () => {
    onAddToCart(product, selectedSize);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleDirectBuy = () => {
    if (onInstantBuy) {
      onInstantBuy(product, selectedSize);
    } else {
      onAddToCart(product, selectedSize);
      onClose();
    }
  };

  return (
    <div
      style={{
        paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))"
      }}
      className="fixed inset-0 z-50 flex items-center justify-center px-2.5 sm:p-6 bg-black/60 backdrop-blur-md animate-fadeIn"
    >
      <div
        style={{
          maxHeight:
            "calc(100dvh - 1.5rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))"
        }}
        className="relative w-full max-w-5xl bg-white text-[#141414] rounded-3xl shadow-2xl overflow-y-auto md:overflow-hidden overscroll-contain border border-black/10 flex flex-col md:flex-row"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="sticky md:absolute top-3 right-3 ml-auto mr-3 mt-3 md:m-0 z-30 p-2 rounded-full bg-white/90 md:bg-black/5 hover:bg-black/15 border border-black/10 md:border-0 text-black shadow-sm md:shadow-none transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Product Video & Photo Gallery */}
        <div className="relative md:w-5/12 bg-neutral-50 px-4 pb-4 pt-2 sm:p-6 -mt-9 md:mt-0 flex flex-col items-center justify-between border-b md:border-b-0 md:border-r border-black/10">
          <div className="w-full flex items-center justify-between gap-2 pr-11 md:pr-0 text-[10px] font-mono text-black/60">
            <span className="truncate">BEACHWEAR SET {product.number} // KERALA</span>
            <span className="font-bold text-amber-950 bg-amber-300/60 px-2 py-0.5 rounded-full flex-shrink-0">
              HANDCRAFTED BEACHWEAR
            </span>
          </div>

          <div className="relative w-full aspect-square max-w-[260px] sm:max-w-[340px] my-2.5 sm:my-3 rounded-2xl overflow-hidden bg-[#181512] border border-black/10 flex items-center justify-center">
            {selectedPhotoIdx === -1 && product.video ? (
              <video
                src={product.video}
                autoPlay
                loop
                muted
                controls
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="relative w-full h-full bg-white">
                <Image
                  src={displayedImage}
                  alt={product.name}
                  fill
                  priority
                  unoptimized
                  sizes="(max-width: 768px) 340px, 380px"
                  className="object-contain p-2 drop-shadow-[0_20px_25px_rgba(40,20,5,0.2)] transition-all duration-500"
                />
              </div>
            )}
          </div>

          {/* Video + Gallery Switcher Thumbnails */}
          <div className="mt-1 flex items-center gap-2 w-full justify-center overflow-x-auto py-1">
            {product.video && (
              <button
                type="button"
                onClick={() => setSelectedPhotoIdx(-1)}
                className={`h-12 px-3 rounded-xl border-2 font-mono text-[10px] font-bold uppercase flex items-center gap-1.5 flex-shrink-0 transition-all ${selectedPhotoIdx === -1
                  ? "bg-black text-amber-300 border-black shadow-md scale-105"
                  : "bg-white/80 text-black border-black/15 hover:bg-white"
                  }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Video</span>
              </button>
            )}

            {gallery.map((imgUrl, idx) => (
              <button
                key={imgUrl + idx}
                type="button"
                onClick={() => setSelectedPhotoIdx(idx)}
                className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${selectedPhotoIdx === idx
                  ? "border-black scale-105 shadow-md"
                  : "border-black/10 opacity-70 hover:opacity-100"
                  }`}
              >
                <Image
                  src={imgUrl}
                  alt={`${product.name} view ${idx + 1}`}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Detailed Technical Specifications & 1-Click Buy */}
        <div className="md:w-7/12 p-4 sm:p-7 flex flex-col justify-between md:overflow-y-auto md:overscroll-contain md:max-h-[90dvh]">
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-black/60 mb-1 md:pr-8">
              <span>SKU: {product.sku}</span>
              <span className="font-semibold text-amber-800">
                ● TROPICAL BEACHWEAR EDITION
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black font-mono uppercase tracking-tight text-[#141414]">
              {product.name}
            </h2>
            <p className="text-xs font-mono uppercase tracking-widest text-black/60 mt-0.5 mb-3">
              {product.subName}
            </p>

            {/* Price Row */}
            <div className="flex items-baseline gap-3 pb-3 border-b border-black/10">
              <span className="text-2xl font-bold font-mono text-black">
                ₹{product.price.toLocaleString("en-IN")}
              </span>
              {product.originalPrice && (
                <span className="text-sm font-mono text-black/40 line-through">
                  ₹{product.originalPrice.toLocaleString("en-IN")}
                </span>
              )}
              <span className="text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full ml-auto">
                FREE EXPRESS DELIVERY
              </span>
            </div>

            {/* Interactive Specs Tabs */}
            <div className="flex items-center gap-1.5 my-3 border-b border-black/10 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab("cut-comparison")}
                className={`text-[10px] font-mono uppercase px-3 py-1 rounded-full transition-all ${activeTab === "cut-comparison"
                  ? "bg-black text-white font-bold"
                  : "text-black/60 hover:text-black hover:bg-black/5"
                  }`}
              >
                1. Coconut Cup Cut
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("skirts")}
                className={`text-[10px] font-mono uppercase px-3 py-1 rounded-full transition-all ${activeTab === "skirts"
                  ? "bg-black text-white font-bold"
                  : "text-black/60 hover:text-black hover:bg-black/5"
                  }`}
              >
                2. Beach Skirt Specs
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("craft")}
                className={`text-[10px] font-mono uppercase px-3 py-1 rounded-full transition-all ${activeTab === "craft"
                  ? "bg-black text-white font-bold"
                  : "text-black/60 hover:text-black hover:bg-black/5"
                  }`}
              >
                3. Comfort Lining
              </button>
            </div>

            {activeTab === "cut-comparison" && (
              <div className="space-y-3 font-mono text-xs animate-fadeIn">
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px] mb-1">
                    <Scissors className="w-3.5 h-3.5" />
                    <span>SIGNATURE BEACH CONTOUR: “CUT A CAP, DON’T SPLIT IN HALF”</span>
                  </div>
                  <p className="text-[10px] text-amber-950/80 leading-relaxed">
                    We slice an oval cap from the flattest side of giant 18 cm+ Kerala coconuts so the cup hugs naturally without bulging, lined inside with soft cotton felt for beach and pool comfort.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {product.cupStyles.map((cup) => (
                    <button
                      key={cup.id}
                      type="button"
                      onClick={() => setSelectedCup(cup.id)}
                      className={`p-2.5 text-left rounded-xl border transition-all ${selectedCup === cup.id
                        ? "bg-black text-white border-black shadow"
                        : "bg-white/80 hover:bg-white text-black border-black/15"
                        }`}
                    >
                      <div className="font-bold text-[11px] uppercase mb-0.5">
                        {cup.name}
                      </div>
                      <div className="text-[10px] opacity-80">
                        {cup.diameter} • {cup.depth}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="bg-white/80 border border-black/10 rounded-xl p-3 text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-black/60">How it&apos;s Cut:</span>
                    <span className="font-semibold text-black text-right">
                      {currentCup.cutType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/60">Depth &amp; Wall:</span>
                    <span className="font-bold text-amber-800">
                      {currentCup.depth} ({currentCup.wallThickness})
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "skirts" && (
              <div className="space-y-3 font-mono text-xs animate-fadeIn">
                <div className="grid grid-cols-2 gap-2">
                  {product.skirtOptions.map((skirt) => (
                    <button
                      key={skirt.id}
                      type="button"
                      onClick={() => setSelectedSkirt(skirt.id)}
                      className={`p-2.5 text-left rounded-xl border transition-all ${selectedSkirt === skirt.id
                        ? "bg-black text-white border-black shadow"
                        : "bg-white/80 hover:bg-white text-black border-black/15"
                        }`}
                    >
                      <div className="font-bold text-[11px] uppercase mb-0.5">
                        {skirt.id === "skirt-1"
                          ? "01. Coir Hula Fringe"
                          : "02. Lined Jute Wrap"}
                      </div>
                      <div className="text-[10px] opacity-80">{skirt.length}</div>
                    </button>
                  ))}
                </div>

                <div className="bg-white/80 border border-black/10 rounded-xl p-3 text-[10px] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-black/60">Fiber / Fabric:</span>
                    <span className="font-semibold text-black text-right max-w-[65%]">
                      {currentSkirt.fabric}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/60">Craft Origin:</span>
                    <span className="font-semibold text-amber-900">
                      {currentSkirt.origin}
                    </span>
                  </div>
                  <p className="text-[10px] text-black/80 font-sans leading-relaxed pt-1">
                    {currentSkirt.details}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "craft" && (
              <div className="space-y-2 font-mono text-xs animate-fadeIn">
                <div className="bg-white/80 p-3 rounded-xl border border-black/10 space-y-2 text-[11px]">
                  {product.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                      <span className="text-[11px] text-black/85">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selector (No AI Button) */}
            <div className="mt-4 mb-2">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="font-bold uppercase tracking-wider">
                  SELECT FIT (ADJUSTABLE BRAIDED TIES)
                </span>
                <span className="text-[10px] text-emerald-800 font-semibold">
                  Fits XS to XL Comfortably
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s.size}
                    type="button"
                    onClick={() => setSelectedSize(s.size)}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-mono font-bold transition-all border ${selectedSize === s.size
                      ? "bg-black text-[#faf8f5] border-black shadow"
                      : "bg-white/80 hover:bg-white text-black border-black/15"
                      }`}
                  >
                    <span className="block truncate">{s.size}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 1-Click Buy Now + Add to Bag CTAs (Sticky safe-area bottom dock on mobile) */}
          <div
            style={{
              paddingBottom: "max(0.25rem, env(safe-area-inset-bottom, 0px))"
            }}
            className="sticky bottom-0 z-20 bg-white pt-3 mt-2 border-t border-black/10 space-y-2"
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleDirectBuy}
                className="flex-1 py-3.5 rounded-full bg-[#141414] hover:bg-black text-[#faf8f5] text-xs font-mono font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>
                  1-CLICK BUY NOW — ₹{product.price.toLocaleString("en-IN")}
                </span>
              </button>

              <button
                type="button"
                onClick={handleAdd}
                className={`py-3.5 px-5 rounded-full text-xs font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${added
                  ? "bg-emerald-700 border-emerald-700 text-white"
                  : "bg-white hover:bg-black/5 border-black/20 text-black"
                  }`}
              >
                {added ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>ADDED</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>+ BAG</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-around text-[10px] font-mono text-black/60 pt-1">
              <span className="flex items-center gap-1">
                <Truck className="w-3 h-3" />
                Express Resort Delivery
              </span>
              <span className="flex items-center gap-1">
                <Leaf className="w-3 h-3" />
                100% Natural Coconut &amp; Coir
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Prepaid via Razorpay
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
