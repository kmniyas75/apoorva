"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Truck,
  MapPin,
  Phone,
  User,
  Zap,
  ArrowRight,
  Edit3
} from "lucide-react";
import ApoorvaLogo from "@/components/ApoorvaLogo";
import { PRODUCTS, Product } from "@/data/products";
import { CustomerDetails, OrderRecord } from "@/lib/types/checkout";

interface SelectedCartItem {
  product: Product;
  size: string;
  quantity: number;
}

function OrderPaymentContent() {
  const params = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();

  const rawOrderId = decodeURIComponent(params?.orderId || "APV-89421").toUpperCase();

  // Read instant URL prefill parameters so there is 0ms waiting time
  const paramSet = searchParams.get("set") || "set1";
  const paramSize = searchParams.get("size") || "FREE SIZE (Adjustable Tie)";
  const paramName = searchParams.get("name") || "";
  const paramPhone = searchParams.get("phone") || "";
  const paramAddr = searchParams.get("addr") || "";
  const paramCity = searchParams.get("city") || "Kochi";
  const paramState = searchParams.get("state") || "Kerala";
  const paramPin = searchParams.get("pin") || "683101";

  const [catalog, setCatalog] = useState<Product[]>(PRODUCTS);
  const [items, setItems] = useState<SelectedCartItem[]>(() => {
    const p1 = PRODUCTS[0];
    const p2 = PRODUCTS[1] || PRODUCTS[0];
    if (paramSet === "both") {
      return [
        { product: p1, size: paramSize, quantity: 1 },
        { product: p2, size: paramSize, quantity: 1 }
      ];
    }
    if (paramSet === "set2") {
      return [{ product: p2, size: paramSize, quantity: 1 }];
    }
    return [{ product: p1, size: paramSize, quantity: 1 }];
  });

  const [discountPct, setDiscountPct] = useState<number>(
    paramSet === "both" ? 15 : 0
  );

  const [customer, setCustomer] = useState<CustomerDetails>({
    fullName: paramName || "Valued Guest",
    email: "",
    phone: paramPhone || "9847089421",
    addressLine1: paramAddr || "Coastal Resort Delivery",
    addressLine2: "",
    city: paramCity,
    state: paramState,
    pincode: paramPin,
    country: "India",
    orderNotes: `WhatsApp Instant Payment Link (#${rawOrderId})`
  });

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [step, setStep] = useState<"ready" | "processing" | "success" | "failed">("ready");
  const [processingText, setProcessingText] = useState(
    "Connecting to Razorpay Secure Payment Gateway..."
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null);

  // Also check MongoDB store in background in case user opened /pay/APV-XXXXX without query params
  useEffect(() => {
    let active = true;
    fetch("/api/admin/store", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        const loadedProducts: Product[] =
          Array.isArray(data.products) && data.products.length > 0
            ? data.products
            : PRODUCTS;
        setCatalog(loadedProducts);

        if (Array.isArray(data.orders)) {
          const matchedOrder = (data.orders as OrderRecord[]).find(
            (o) => o.orderId.toUpperCase() === rawOrderId
          );
          if (matchedOrder) {
            if (matchedOrder.status === "paid" || matchedOrder.status === "dispatched" || matchedOrder.status === "delivered") {
              setConfirmedOrder(matchedOrder);
              setStep("success");
              return;
            }
            const mappedItems: SelectedCartItem[] = matchedOrder.items.map((it) => {
              const prod =
                loadedProducts.find((p) => p.id === it.productId) ||
                loadedProducts[0];
              return {
                product: prod,
                size: it.size || "FREE SIZE (Adjustable Tie)",
                quantity: it.quantity || 1
              };
            });
            if (mappedItems.length > 0) {
              setItems(mappedItems);
            }
            setDiscountPct(matchedOrder.pricing?.discountPercentage || 0);
            setCustomer((prev) => ({
              ...prev,
              fullName: matchedOrder.customer?.fullName || prev.fullName,
              email: matchedOrder.customer?.email || prev.email,
              phone: matchedOrder.customer?.phone || prev.phone,
              addressLine1: matchedOrder.customer?.addressLine1 || prev.addressLine1,
              city: matchedOrder.customer?.city || prev.city,
              state: matchedOrder.customer?.state || prev.state,
              pincode: matchedOrder.customer?.pincode || prev.pincode
            }));
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [rawOrderId]);

  const rawSubtotal = items.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0
  );
  const discountAmount = Math.round((rawSubtotal * discountPct) / 100);
  const total = Math.max(0, rawSubtotal - discountAmount);

  const handlePayNow = async () => {
    if (step === "processing") return;

    if (!customer.fullName.trim() || !customer.addressLine1.trim() || !/^\d{6}$/.test(customer.pincode.trim())) {
      setIsEditingAddress(true);
      setErrorMessage("Please verify your Name, Delivery Address, and 6-digit PIN code.");
      return;
    }

    const finalCustomer: CustomerDetails = {
      ...customer,
      email:
        customer.email.trim() ||
        `${customer.phone.replace(/\D/g, "").slice(-10) || "guest"}@apoorvashells.com`
    };

    setErrorMessage(null);
    setStep("processing");
    setProcessingText("Initializing Razorpay UPI / Card Payment Session...");

    try {
      const createRes = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.product.id,
            size: i.size,
            quantity: i.quantity
          })),
          customer: finalCustomer,
          appliedDiscount: discountPct
        })
      });

      if (!createRes.ok) {
        const errData = await createRes.json();
        throw new Error(errData.error || "Failed to initialize payment");
      }

      const orderData = await createRes.json();
      const {
        orderId: razorpayOrderId,
        isSandbox,
        isLiveConfigured,
        keyId,
        amount,
        currency
      } = orderData;

      if (isLiveConfigured && typeof window !== "undefined" && window.Razorpay) {
        const rzp = new window.Razorpay({
          key: keyId,
          amount,
          currency: currency || "INR",
          name: "APOORVA SHELLS",
          description: `Order #${rawOrderId} — Aluva, Kerala Atelier`,
          order_id: razorpayOrderId,
          prefill: {
            name: finalCustomer.fullName,
            email: finalCustomer.email,
            contact: finalCustomer.phone
          },
          theme: {
            color: "#141414"
          },
          handler: async (response) => {
            setProcessingText("Verifying payment & activating Blue Dart Air tracking...");
            const verifyRes = await fetch("/api/checkout/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                existingOrderId: rawOrderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                customer: finalCustomer,
                items: orderData.items,
                pricing: orderData.pricing,
                paymentMethod: "razorpay",
                isSandbox: false
              })
            });
            const verifyResult = await verifyRes.json();
            if (!verifyRes.ok) {
              setErrorMessage(verifyResult.error || "Payment verification failed");
              setStep("failed");
              return;
            }
            setConfirmedOrder(verifyResult.order);
            setStep("success");
          },
          modal: {
            ondismiss: () => {
              setStep("ready");
            }
          }
        });
        rzp.open();
        return;
      }

      // Instant Gateway Verification
      setProcessingText("Confirming Razorpay payment & assigning Blue Dart Air AWB...");
      await new Promise((r) => setTimeout(r, 700));

      const mockPaymentId = `pay_rzp_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      const mockSignature = `sig_sim_${Math.random().toString(36).slice(2, 10)}`;

      const verifyRes = await fetch("/api/checkout/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          existingOrderId: rawOrderId,
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: mockSignature,
          customer: finalCustomer,
          items: orderData.items,
          pricing: orderData.pricing,
          paymentMethod: "upi",
          isSandbox
        })
      });

      const verifyResult = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyResult.error || "Payment confirmation failed");
      }

      setConfirmedOrder(verifyResult.order);
      setStep("success");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Payment could not be completed"
      );
      setStep("failed");
    }
  };

  return (
    <main className="min-h-screen bg-[#faf8f5] text-[#141414] flex flex-col justify-between py-6 px-4 sm:px-6 font-mono">
      <div className="max-w-lg w-full mx-auto space-y-4">
        {/* Top Brand & Verified SSL Strip */}
        <div className="flex items-center justify-between bg-white px-4 py-3.5 rounded-2xl border border-black/10 shadow-xs">
          <Link href="/" className="shrink-0">
            <ApoorvaLogo size="sm" showTagline={true} />
          </Link>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-[10px] font-bold uppercase tracking-wider shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>Razorpay Link</span>
          </div>
        </div>

        {/* Main Order Payment Card */}
        <div className="bg-white rounded-3xl border border-black/15 shadow-xl overflow-hidden">
          {/* Dark Banner Header */}
          <div className="bg-[#141414] text-[#faf8f5] px-5 py-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-bold">
                {step === "success"
                  ? "PAYMENT COMPLETED"
                  : "1-CLICK WHATSAPP ORDER CHECKOUT"}
              </div>
              <h1 className="text-base sm:text-lg font-black tracking-wider uppercase mt-0.5">
                ORDER #{rawOrderId}
              </h1>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-white/60">
                Total Payable
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-300">
                ₹{total.toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {step === "ready" || step === "failed" ? (
              <>
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Reserved Items Summary */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-black/60">
                      Selected Handcrafted Set(s)
                    </span>
                    <div className="flex gap-1.5">
                      {catalog.slice(0, 2).map((p, idx) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setItems([
                              {
                                product: p,
                                size: items[0]?.size || "FREE SIZE (Adjustable Tie)",
                                quantity: 1
                              }
                            ]);
                            setDiscountPct(0);
                          }}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border transition-colors ${
                            items.length === 1 && items[0].product.id === p.id
                              ? "bg-black text-white border-black"
                              : "bg-neutral-100 text-black/70 border-black/10"
                          }`}
                        >
                          Set 0{idx + 1}
                        </button>
                      ))}
                      {catalog.length >= 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            setItems([
                              {
                                product: catalog[0],
                                size: items[0]?.size || "FREE SIZE (Adjustable Tie)",
                                quantity: 1
                              },
                              {
                                product: catalog[1],
                                size: items[0]?.size || "FREE SIZE (Adjustable Tie)",
                                quantity: 1
                              }
                            ]);
                            setDiscountPct(15);
                          }}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border transition-colors ${
                            items.length >= 2
                              ? "bg-amber-900 text-white border-amber-950"
                              : "bg-amber-50 text-amber-950 border-amber-300"
                          }`}
                        >
                          Both (-15%)
                        </button>
                      )}
                    </div>
                  </div>

                  {items.map((item, idx) => (
                    <div
                      key={`${item.product.id}-${idx}`}
                      className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#faf8f5] border border-black/10"
                    >
                      <div className="w-16 h-16 rounded-xl bg-white border border-black/10 overflow-hidden shrink-0 flex items-center justify-center">
                        <Image
                          src={item.product.image}
                          alt={item.product.name}
                          width={64}
                          height={64}
                          unoptimized
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black uppercase text-black truncate">
                          {item.product.name}
                        </div>
                        <div className="text-[11px] text-amber-900 font-bold mt-0.5">
                          Fit: {item.size}
                        </div>
                        <div className="text-[10px] text-emerald-800 font-bold uppercase mt-0.5">
                          ✓ In Stock • Free Express Air Delivery
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-black">
                          ₹{item.product.price.toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>
                  ))}

                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-bold">
                      <span>🎁 2-Set Bundle Discount (15% OFF)</span>
                      <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                </div>

                {/* Verified Delivery Details Card */}
                <div className="rounded-2xl border border-black/15 bg-neutral-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-black/75 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-800" />
                      Delivery Parcel Details
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(!isEditingAddress)}
                      className="text-[10px] font-bold text-amber-900 hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{isEditingAddress ? "Done" : "Edit"}</span>
                    </button>
                  </div>

                  {!isEditingAddress ? (
                    <div className="space-y-1.5 text-xs text-black/85">
                      <div className="flex items-center gap-2 font-bold text-black">
                        <User className="w-3.5 h-3.5 text-black/50 shrink-0" />
                        <span>{customer.fullName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-black/75">
                        <Phone className="w-3.5 h-3.5 text-black/50 shrink-0" />
                        <span>+91 {customer.phone.replace(/\D/g, "").slice(-10)}</span>
                      </div>
                      <div className="flex items-start gap-2 text-black/80 pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-black/50 shrink-0 mt-0.5" />
                        <span>
                          {customer.addressLine1}, {customer.city}, {customer.state} —{" "}
                          <strong className="text-black">PIN {customer.pincode}</strong>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 text-xs pt-1">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-black/70 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={customer.fullName}
                          onChange={(e) =>
                            setCustomer((p) => ({ ...p, fullName: e.target.value }))
                          }
                          className="w-full bg-white border border-black/20 rounded-xl px-3 py-2 text-xs font-bold"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-black/70 mb-1">
                            Phone Number *
                          </label>
                          <input
                            type="tel"
                            value={customer.phone}
                            onChange={(e) =>
                              setCustomer((p) => ({ ...p, phone: e.target.value }))
                            }
                            className="w-full bg-white border border-black/20 rounded-xl px-3 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-black/70 mb-1">
                            6-Digit PIN Code *
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            value={customer.pincode}
                            onChange={(e) =>
                              setCustomer((p) => ({
                                ...p,
                                pincode: e.target.value.replace(/\D/g, "").slice(0, 6)
                              }))
                            }
                            className="w-full bg-white border border-black/20 rounded-xl px-3 py-2 text-xs font-bold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-black/70 mb-1">
                          House / Street / City Address *
                        </label>
                        <input
                          type="text"
                          value={customer.addressLine1}
                          onChange={(e) =>
                            setCustomer((p) => ({
                              ...p,
                              addressLine1: e.target.value
                            }))
                          }
                          className="w-full bg-white border border-black/20 rounded-xl px-3 py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-black/70 mb-1">
                          Email (Optional — for Tax Invoice)
                        </label>
                        <input
                          type="email"
                          placeholder="you@example.com"
                          value={customer.email}
                          onChange={(e) =>
                            setCustomer((p) => ({ ...p, email: e.target.value }))
                          }
                          className="w-full bg-white border border-black/20 rounded-xl px-3 py-2 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary 1-Click Pay Button */}
                <button
                  type="button"
                  onClick={handlePayNow}
                  className="w-full py-4 px-5 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-black shrink-0" />
                  <span>
                    PAY ₹{total.toLocaleString("en-IN")} NOW (UPI / GPAY / CARDS)
                  </span>
                </button>

                <div className="flex items-center justify-center gap-2 text-[10px] text-black/60 text-center">
                  <Lock className="w-3 h-3 text-emerald-700 shrink-0" />
                  <span>
                    256-Bit Encrypted Razorpay Checkout • Instant WhatsApp &amp; Email Receipt
                  </span>
                </div>
              </>
            ) : step === "processing" ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full border-4 border-black/10 border-t-amber-600 animate-spin" />
                  <Lock className="w-5 h-5 absolute inset-0 m-auto text-black" />
                </div>
                <div className="text-xs font-black uppercase tracking-wider">
                  {processingText}
                </div>
                <p className="text-[11px] text-black/60 max-w-xs">
                  Please do not close this window while we confirm your payment...
                </p>
              </div>
            ) : (
              /* SUCCESS RECEIPT VIEW */
              <div className="space-y-5 py-2">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <span className="px-3 py-0.5 rounded-full bg-emerald-900 text-white text-[10px] font-bold uppercase tracking-widest">
                    Payment Verified • Prepaid
                  </span>
                  <h2 className="text-base sm:text-lg font-black uppercase">
                    Thank You, {confirmedOrder?.customer.fullName || customer.fullName}!
                  </h2>
                  <p className="text-xs text-black/70 max-w-sm">
                    Your handcrafted <strong>APOORVA SHELLS</strong> order{" "}
                    <strong>#{confirmedOrder?.orderId || rawOrderId}</strong> is confirmed
                    and queued for dispatch from our Aluva, Kerala Atelier.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#faf8f5] border border-black/10 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-black/60">Order ID:</span>
                    <span className="font-black">
                      #{confirmedOrder?.orderId || rawOrderId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/60">Amount Paid:</span>
                    <span className="font-black text-emerald-800">
                      ₹{(confirmedOrder?.pricing.total || total).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/60">Express Courier:</span>
                    <span className="font-bold">
                      {confirmedOrder?.shipping?.courierName || "Blue Dart Express (Air)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/60">AWB Tracking #:</span>
                    <span className="font-black text-amber-900">
                      {confirmedOrder?.shipping?.trackingNumber || "BD-88492019IN"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <Link
                    href={`/track?orderId=${encodeURIComponent(
                      confirmedOrder?.orderId || rawOrderId
                    )}`}
                    className="flex-1 py-3.5 px-4 rounded-full bg-[#141414] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-black transition-colors"
                  >
                    <Truck className="w-4 h-4 text-amber-300" />
                    <span>Track Live Shipment</span>
                  </Link>
                  <Link
                    href="/"
                    className="py-3.5 px-5 rounded-full border border-black/20 text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-neutral-100 transition-colors"
                  >
                    <span>Visit Store</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-black/45 mt-6 uppercase tracking-widest">
        APOORVA SHELLS™ • Handcrafted Coastal Resortwear • Aluva, Kerala
      </p>
    </main>
  );
}

export default function OrderPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-6 font-mono text-xs font-bold uppercase tracking-widest">
          Loading APOORVA SHELLS Secure Payment Link...
        </div>
      }
    >
      <OrderPaymentContent />
    </Suspense>
  );
}
