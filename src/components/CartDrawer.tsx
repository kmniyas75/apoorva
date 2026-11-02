import React, { useState } from "react";
import Image from "next/image";
import { Product } from "@/data/products";
import { X, Trash2, Plus, Minus, Tag, Lock, CheckCircle2, Truck, MapPin, Loader2 } from "lucide-react";

export interface CartItem {
  product: Product;
  size: string;
  quantity: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, size: string, delta: number) => void;
  onRemoveItem: (productId: string, size: string) => void;
  appliedDiscount: number;
  gstPercent?: number;
  onApplyPromoCode: (code: string) => boolean;
  onStartCheckout?: (initialPincode?: string) => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  appliedDiscount,
  gstPercent = 12,
  onApplyPromoCode,
  onStartCheckout
}: CartDrawerProps) {
  const [promoInput, setPromoInput] = useState("");
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "success">("cart");

  // PIN Code Delivery & Live Shipping Rate Calculator
  const [pincodeInput, setPincodeInput] = useState("");
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeResult, setPincodeResult] = useState<{
    city: string;
    state: string;
    estimatedDelivery: string;
    courier: string;
    shippingRate?: number;
  } | null>(null);
  const [pincodeError, setPincodeError] = useState<string | null>(null);

  if (!isOpen) return null;

  const rawSubtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const discountAmount = Math.round((rawSubtotal * appliedDiscount) / 100);
  const subtotal = Math.max(0, rawSubtotal - discountAmount);
  const taxableAmount = Number(
    (subtotal / (1 + gstPercent / 100)).toFixed(2)
  );
  const gstAmount = Number((subtotal - taxableAmount).toFixed(2));
  const shipping =
    subtotal === 0
      ? 0
      : typeof pincodeResult?.shippingRate === "number"
        ? Number(pincodeResult.shippingRate.toFixed(2))
        : 185;
  const total = Number((subtotal + shipping).toFixed(2));

  const lookupPincodeRate = async (pin: string) => {
    if (!/^\d{6}$/.test(pin)) {
      setPincodeError("Enter a valid 6-digit Indian PIN code");
      return;
    }
    setPincodeLoading(true);
    setPincodeError(null);
    try {
      const res = await fetch(`/api/shipping/pincode?pincode=${pin}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setPincodeResult(data);
      } else {
        setPincodeError(data.error || "PIN code lookup failed.");
      }
    } catch {
      setPincodeError("Serviceability check unavailable.");
    } finally {
      setPincodeLoading(false);
    }
  };

  const handleCheckPincode = async (e: React.FormEvent) => {
    e.preventDefault();
    await lookupPincodeRate(pincodeInput.trim());
  };

  const handlePromoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    const ok = onApplyPromoCode(promoInput.trim());
    if (ok) {
      setPromoMessage("VIP 15% markdown applied!");
    } else {
      setPromoMessage("Invalid code. Try 'APOORVA-VIP15'");
    }
  };

  const handleCompleteCheckout = () => {
    if (onStartCheckout) {
      onClose();
      onStartCheckout(pincodeInput.trim() || undefined);
    } else {
      setCheckoutStep("success");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md h-dvh bg-white text-[#141414] shadow-2xl flex flex-col border-l border-black/10 overflow-hidden">
        {/* Header */}
        <div
          style={{
            paddingTop: "max(1.25rem, env(safe-area-inset-top, 0px))"
          }}
          className="px-6 pb-4 border-b border-black/10 bg-neutral-50 flex items-center justify-between"
        >
          <div className="flex items-baseline gap-2">
            <h3 className="font-mono font-bold text-sm uppercase tracking-widest">
              YOUR SHOPPING BAG
            </h3>
            <span className="text-xs font-mono text-black/60">
              ({items.reduce((acc, i) => acc + i.quantity, 0)} items)
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 transition-colors text-black/70 hover:text-black"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live PIN-Based Shipping Rate Banner */}
        <div className="px-6 py-3 bg-neutral-100 border-b border-black/5 text-[11px] font-mono">
          {pincodeResult ? (
            <p className="text-emerald-900 font-semibold flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                PIN {pincodeInput}: {pincodeResult.city} ({pincodeResult.courier})
              </span>
              <span className="font-black text-black">
                Shipping: ₹{shipping.toLocaleString("en-IN")}
              </span>
            </p>
          ) : (
            <p className="text-black/80">
              Enter your 6-digit PIN code below to calculate your exact{" "}
              <span className="font-bold text-black">Shiprocket Courier Rate</span>.
            </p>
          )}
        </div>

        {/* Content Area */}
        {checkoutStep === "success" ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center font-mono">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold uppercase tracking-wider mb-2">
              ORDER CONFIRMED
            </h4>
            <p className="text-xs text-black/70 mb-4">
              Thank you for shopping with APOORVA SHELLS. Your order{" "}
              <span className="font-bold text-black">#APV-89421</span> has been queued for hand-inspection and courier dispatch.
            </p>
            <div className="bg-white/80 p-4 rounded-xl border border-black/10 w-full text-left text-xs space-y-1 mb-6">
              <div className="flex justify-between">
                <span>Total Paid:</span>
                <span className="font-bold">₹{total.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-black/60">
                <span>Shipping:</span>
                <span>Express Courier (2-3 business days)</span>
              </div>
            </div>
            <button
              onClick={() => {
                setCheckoutStep("cart");
                onClose();
              }}
              className="w-full py-3 bg-black text-white font-mono text-xs uppercase tracking-widest rounded-full hover:bg-black/80 transition-all"
            >
              Continue Browsing
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center font-mono text-black/60">
            <p className="text-sm uppercase tracking-wider mb-3">Your bag is empty</p>
            <p className="text-xs text-black/40 max-w-xs mb-6">
              Explore the APOORVA SHELLS capsule and select your artisanal piece.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-black text-white text-xs uppercase tracking-widest rounded-full hover:bg-black/80 transition-all"
            >
              Explore Collection
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.map((item) => (
              <div
                key={`${item.product.id}-${item.size}`}
                className="flex gap-4 p-3 bg-white/70 border border-black/5 rounded-2xl relative group"
              >
                <div className="relative w-20 h-20 bg-neutral-50 rounded-xl flex-shrink-0 p-1">
                  <Image
                    src={item.product.image}
                    alt={item.product.name}
                    fill
                    unoptimized
                    sizes="80px"
                    className="object-contain"
                  />
                </div>

                <div className="flex-1 min-w-0 font-mono">
                  <h4 className="text-xs font-bold uppercase truncate text-[#111111]">
                    {item.product.name}
                  </h4>
                  <p className="text-[10px] text-black/60 mb-2">
                    Size: <span className="font-bold text-black">{item.size}</span> | {item.product.color}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-black">
                      ₹{(item.product.price * item.quantity).toLocaleString("en-IN")}
                    </span>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-2 bg-neutral-100 rounded-full px-2 py-0.5 border border-black/10">
                      <button
                        onClick={() =>
                          onUpdateQuantity(item.product.id, item.size, -1)
                        }
                        className="text-black/60 hover:text-black p-0.5"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold px-1">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          onUpdateQuantity(item.product.id, item.size, 1)
                        }
                        className="text-black/60 hover:text-black p-0.5"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onRemoveItem(item.product.id, item.size)}
                  className="text-black/30 hover:text-red-600 p-1 transition-colors self-start"
                  title="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer with totals & checkout */}
        {checkoutStep === "cart" && items.length > 0 && (
          <div
            style={{
              paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))"
            }}
            className="px-6 pt-5 bg-neutral-50 border-t border-black/10 font-mono space-y-3.5"
          >
            {/* PIN Code Delivery Date & Serviceability Check */}
            <div className="p-3 bg-white/80 rounded-2xl border border-black/10 text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-black">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-amber-900" />
                  <span>Check Delivery Date & Air Hub</span>
                </span>
                <span className="text-[10px] text-emerald-800 font-semibold">
                  Express Air Cargo
                </span>
              </div>

              <form onSubmit={handleCheckPincode} className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="w-3.5 h-3.5 text-black/40 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit PIN code"
                    value={pincodeInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setPincodeInput(val);
                      if (val.length === 6) {
                        void lookupPincodeRate(val);
                      }
                    }}
                    className="w-full bg-white border border-black/15 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-black"
                  />
                </div>
                <button
                  type="submit"
                  disabled={pincodeLoading}
                  className="px-3.5 py-1.5 bg-black text-white text-[11px] font-bold uppercase rounded-xl hover:bg-black/80 transition-all disabled:opacity-50"
                >
                  {pincodeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Check Rate"}
                </button>
              </form>

              {pincodeResult && (
                <div className="p-2 bg-emerald-50 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-950 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <div>
                        Delivery to <strong className="text-black">{pincodeResult.city}, {pincodeResult.state}</strong>:
                      </div>
                      <div className="font-bold text-emerald-900 mt-0.5">
                        {pincodeResult.estimatedDelivery} ({pincodeResult.courier})
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[9px] uppercase text-black/60 font-bold">
                      Exact Rate
                    </div>
                    <div className="text-xs font-black text-black">
                      ₹{shipping.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              )}

              {pincodeError && (
                <p className="text-[10px] text-red-700 font-semibold">{pincodeError}</p>
              )}
            </div>

            {/* Promo Code Input */}
            <form onSubmit={handlePromoSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="VIP Code (e.g. APOORVA-VIP15)"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                className="flex-1 bg-white border border-black/15 rounded-xl px-3 py-2 text-xs uppercase focus:outline-none focus:border-black"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-black text-white text-xs uppercase font-bold tracking-wider rounded-xl hover:bg-black/80 transition-all"
              >
                Apply
              </button>
            </form>
            {promoMessage && (
              <p className="text-[10px] text-emerald-800 font-semibold -mt-2">
                {promoMessage}
              </p>
            )}

            {/* Price Calculations in INR (Product Rate, GST, Shipping Rate & Total) */}
            <div className="space-y-1.5 text-xs text-black/75 pt-2 border-t border-black/10">
              <div className="flex justify-between">
                <span>Product Rate (Excl. GST):</span>
                <span className="font-semibold text-black">
                  ₹{taxableAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>GST ({gstPercent}% Included):</span>
                <span className="font-semibold text-black">
                  ₹{gstAmount.toLocaleString("en-IN")}
                </span>
              </div>
              {appliedDiscount > 0 && (
                <div className="flex justify-between text-emerald-800 font-semibold">
                  <span>VIP Discount ({appliedDiscount}%):</span>
                  <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Product Subtotal (Incl. GST):</span>
                <span className="font-bold text-black">
                  ₹{subtotal.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between text-amber-950 font-semibold">
                <span>
                  Shipping Rate{" "}
                  {pincodeResult
                    ? `(PIN ${pincodeInput})`
                    : "(Est. — Enter PIN above)"}
                  :
                </span>
                <span className="font-bold text-black">
                  + ₹{shipping.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between text-sm font-black text-black pt-2 border-t border-black/15">
                <span>Total Payable (Incl. GST + Shipping):</span>
                <span>₹{total.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Checkout Action */}
            <button
              onClick={handleCompleteCheckout}
              className="w-full py-3.5 bg-[#141414] hover:bg-black text-[#faf8f5] text-xs font-bold uppercase tracking-widest rounded-full shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>SECURE CHECKOUT — ₹{total.toLocaleString("en-IN")}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
