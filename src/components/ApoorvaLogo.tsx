import React from "react";

interface ApoorvaLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
  showTagline?: boolean;
  className?: string;
}

export default function ApoorvaLogo({
  size = "md",
  variant = "dark",
  showTagline = true,
  className = ""
}: ApoorvaLogoProps) {
  const iconDimensions =
    size === "sm" ? "w-8 h-8" : size === "lg" ? "w-12 h-12" : "w-10 h-10";
  const titleSize =
    size === "sm"
      ? "text-lg"
      : size === "lg"
      ? "text-2xl md:text-3xl"
      : "text-xl md:text-2xl";

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Bespoke APOORVA Coconut & Coastal Wave Crest Emblem */}
      <div
        className={`relative ${iconDimensions} rounded-full bg-[#f5efe4] border border-black/15 shadow-sm flex items-center justify-center flex-shrink-0 overflow-hidden`}
      >
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-0.5"
          aria-hidden="true"
        >
          <circle cx="60" cy="60" r="56" stroke="#141414" strokeWidth="2.5" />
          <circle
            cx="60"
            cy="60"
            r="50"
            stroke="#92400e"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />
          {/* Rising Coastal Sun */}
          <circle cx="60" cy="44" r="14" fill="#d97706" fillOpacity="0.22" />
          <path
            d="M60 19V25M41 27L44.5 30.5M79 27L75.5 30.5"
            stroke="#92400e"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Halter Cord */}
          <path
            d="M39 42L60 22L81 42"
            stroke="#78350f"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Dual Sculpted Coconut Cups */}
          <path
            d="M25 57C25 45 36 38 48 44C54 47.5 56 54 54 60C50 67 36 68 28 62C26 60.5 25 58.8 25 57Z"
            fill="#451a03"
            stroke="#141414"
            strokeWidth="2"
          />
          <path
            d="M95 57C95 45 84 38 72 44C66 47.5 64 54 66 60C70 67 84 68 92 62C94 60.5 95 58.8 95 57Z"
            fill="#451a03"
            stroke="#141414"
            strokeWidth="2"
          />
          {/* Center Coconut Ring */}
          <circle
            cx="60"
            cy="55"
            r="5.5"
            stroke="#b45309"
            strokeWidth="3"
            fill="#f7f3ec"
          />
          {/* Coir & Ocean Waves */}
          <path
            d="M24 77C34 72 46 82 60 77C74 72 86 82 96 77"
            stroke="#92400e"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M32 87C42 83 50 91 60 87C70 83 78 91 88 87"
            stroke="#141414"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Brand Wordmark */}
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline">
          <span
            className={`${titleSize} font-black uppercase font-mono tracking-[0.14em] ${
              variant === "light" ? "text-[#faf8f5]" : "text-[#141414]"
            }`}
          >
            APOORVA
          </span>
          <span
            className={`text-[10px] font-bold tracking-widest ml-0.5 ${
              variant === "light" ? "text-amber-300" : "text-amber-900"
            }`}
          >
            ™
          </span>
        </div>
        {showTagline && (
          <span className="text-[9px] font-mono uppercase tracking-[0.26em] text-amber-900/80 font-semibold mt-1">
            COASTAL BEACHWEAR
          </span>
        )}
      </div>
    </div>
  );
}

