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
  Mail,
  Zap,
  ArrowRight,
  Loader2
} from "lucide-react";
import ApoorvaLogo from "@/components/ApoorvaLogo";
import { PRODUCTS, Product } from "@/data/products";
import { CustomerDetails, OrderRecord } from "@/lib/types/checkout";

interface SelectedCartItem {
  product: Product;
  size: string;
  quantity: number;
}

const SIZE_OPTIONS = [
  "FREE SIZE (Adjustable Tie)",
  "S/M (Style A Cup)",
  "M/L (Style B Cup)"
];

function OrderPaymentContent() {
  const params = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();

  const rawOrderId = decodeURIComponent(
    params?.orderId || "APV-89421"
  ).toUpperCase();

  // Read instant URL prefill parameters
  const paramSet = searchParams.get("set") || "set1";
  const paramSize = searchParams.get("size") || "FREE SIZE (Adjustable Tie)";
  const paramName = searchParams.get("name") || "";
  const paramEmail = searchParams.get("email") || "";
  const paramPhone = searchParams.get("phone") || "";
  const paramAddr = searchParams.get("addr") || "";
  const paramCity = searchParams.get("city") || "";
  const paramState = searchParams.get("state") || "";
  const paramPin = searchParams.get("pin") || "";

  const [catalog, setCatalog] = useState<Product[]>(PRODUCTS);
  const [selectedSize, setSelectedSize] = useState<string>(paramSize);
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
    fullName:
      paramName &&
      !paramName.includes("Guest") &&
      !paramName.includes("Client")
        ? paramName
        : "",
    email: paramEmail && !paramEmail.includes("@social.") ? paramEmail : "",
    phone: paramPhone || "",
    addressLine1:
      paramAddr && paramAddr !== "Pending Checkout Address" ? paramAddr : "",
    addressLine2: "",
    city: paramCity || "Kochi",
    state: paramState || "Kerala",
    pincode: paramPin || "",
    country: "India",
    orderNotes: `WhatsApp Express Checkout (#${rawOrderId})`
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [resolvedDeliveryInfo, setResolvedDeliveryInfo] = useState<
    string | null
  >(null);
  const [gstPercent, setGstPercent] = useState<number>(12);
  const [shippingFee, setShippingFee] = useState<number>(95);
  const [courierName, setCourierName] = useState<string>(
    "Blue Dart Air Express"
  );

  const [step, setStep] = useState<
    "ready" | "processing" | "success" | "failed"
  >("ready");
  const [processingText, setProcessingText] = useState(
    "Connecting to Razorpay Secure Payment Gateway..."
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(
    null
  );

  // Sync catalog & check if order already exists in MongoDB
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
        if (typeof data.settings?.gstPercent === "number") {
          setGstPercent(data.settings.gstPercent);
        }

        if (Array.isArray(data.orders)) {
          const matchedOrder = (data.orders as OrderRecord[]).find(
            (o) => o.orderId.toUpperCase() === rawOrderId
          );
          if (matchedOrder) {
            if (
              matchedOrder.status === "paid" ||
              matchedOrder.status === "dispatched" ||
              matchedOrder.status === "delivered"
            ) {
              setConfirmedOrder(matchedOrder);
              setStep("success");
              return;
            }
            const mappedItems: SelectedCartItem[] = matchedOrder.items.map(
              (it) => {
                const prod =
                  loadedProducts.find((p) => p.id === it.productId) ||
                  loadedProducts[0];
                return {
                  product: prod,
                  size: it.size || "FREE SIZE (Adjustable Tie)",
                  quantity: it.quantity || 1
                };
              }
            );
            if (mappedItems.length > 0) {
              setItems(mappedItems);
              setSelectedSize(mappedItems[0].size);
            }
            setDiscountPct(matchedOrder.pricing?.discountPercentage || 0);
            setCustomer((prev) => ({
              ...prev,
              fullName:
                prev.fullName ||
                (matchedOrder.customer?.fullName &&
                !matchedOrder.customer.fullName.includes("Guest") &&
                !matchedOrder.customer.fullName.includes("Client")
                  ? matchedOrder.customer.fullName
                  : ""),
              email:
                prev.email ||
                (matchedOrder.customer?.email &&
                !matchedOrder.customer.email.includes("@social.")
                  ? matchedOrder.customer.email
                  : ""),
              phone: prev.phone || matchedOrder.customer?.phone || "",
              addressLine1:
                prev.addressLine1 ||
                (matchedOrder.customer?.addressLine1 &&
                matchedOrder.customer.addressLine1 !==
                  "Pending Checkout Address" &&
                matchedOrder.customer.addressLine1 !== "Coastal Resort Delivery"
                  ? matchedOrder.customer.addressLine1
                  : ""),
              city: matchedOrder.customer?.city || prev.city,
              state: matchedOrder.customer?.state || prev.state,
              pincode: prev.pincode || matchedOrder.customer?.pincode || ""
            }));
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [rawOrderId]);

  // Live PIN code lookup -> Auto-detect City, State, Express Courier ETA & Exact Shipping Rate
  useEffect(() => {
    const pin = customer.pincode.replace(/\D/g, "");
    if (pin.length === 6) {
      setPincodeLoading(true);
      fetch(`/api/shipping/pincode?pincode=${pin}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setCustomer((prev) => ({
              ...prev,
              city: data.city,
              state: data.state
            }));
            const exactRate =
              typeof data.shippingRate === "number" && data.shippingRate > 0
                ? Number(data.shippingRate.toFixed(2))
                : 185;
            setShippingFee(exactRate);
            setCourierName(data.courier || "Blue Dart Air Express");
            setResolvedDeliveryInfo(
              `Express Air Delivery by ${data.estimatedDelivery} to ${data.city}, ${data.state} (${data.courier}) • Shipping Rate: ₹${exactRate.toLocaleString("en-IN")}`
            );
          }
        })
        .catch(() => {})
        .finally(() => setPincodeLoading(false));
    } else {
      setResolvedDeliveryInfo(null);
    }
  }, [customer.pincode]);

  const handleSizeChange = (newSize: string) => {
    setSelectedSize(newSize);
    setItems((prev) => prev.map((it) => ({ ...it, size: newSize })));
  };

  const handleFieldChange = (
    field: keyof CustomerDetails,
    value: string
  ) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (errorMessage) setErrorMessage(null);
  };

  const rawSubtotal = items.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0
  );
  const discountAmount = Math.round((rawSubtotal * discountPct) / 100);
  const subtotal = Math.max(0, rawSubtotal - discountAmount);
  const taxableAmount = Number(
    (subtotal / (1 + gstPercent / 100)).toFixed(2)
  );
  const gstAmount = Number((subtotal - taxableAmount).toFixed(2));
  const total = Number((subtotal + shippingFee).toFixed(2));

  const handlePayNow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "processing") return;

    // Validate all required fields before initiating payment
    const errors: Record<string, string> = {};
    if (customer.fullName.trim().length < 2) {
      errors.fullName = "Please enter your full name.";
    }
    const emailClean = customer.email.trim();
    if (!emailClean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      errors.email = "Please enter a valid email ID for your order receipt & tracking.";
    }
    const phoneDigits = customer.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      errors.phone = "Please enter a valid 10-digit WhatsApp / mobile number.";
    }
    const pinClean = customer.pincode.trim();
    if (!/^[1-8]\d{5}$/.test(pinClean)) {
      errors.pincode = "Please enter a valid 6-digit Indian PIN code.";
    }
    if (customer.addressLine1.trim().length < 5) {
      errors.addressLine1 = "Please enter your House/Flat name, Street & Area.";
    }
    if (customer.city.trim().length < 2) {
      errors.city = "Please enter your city.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage(
        "Please complete the highlighted delivery details below before paying."
      );
      return;
    }

    const finalCustomer: CustomerDetails = {
      ...customer,
      fullName: customer.fullName.trim(),
      email: emailClean,
      phone: phoneDigits.slice(-10),
      addressLine1: customer.addressLine1.trim(),
      city: customer.city.trim(),
      state: customer.state.trim() || "Kerala",
      pincode: pinClean
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
          appliedDiscount: discountPct,
          shippingFee
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
            setProcessingText(
              "Verifying payment & sending WhatsApp + Email confirmation..."
            );
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
              setErrorMessage(
                verifyResult.error || "Payment verification failed"
              );
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
      setProcessingText(
        "Confirming payment & sending WhatsApp + Email receipt..."
      );
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
    <main className="min-h-screen bg-[#faf8f5] text-[#141414] flex flex-col justify-between py-5 px-3.5 sm:px-6 font-mono">
      <div className="max-w-lg w-full mx-auto space-y-4">
        {/* Top Brand & Verified SSL Strip */}
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-black/10 shadow-xs">
          <Link href="/" className="shrink-0">
            <ApoorvaLogo size="sm" showTagline={true} />
          </Link>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-[10px] font-bold uppercase tracking-wider shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>Verified Checkout</span>
          </div>
        </div>

        {/* Main Order Payment Card */}
        <div className="bg-white rounded-3xl border border-black/15 shadow-xl overflow-hidden">
          {/* Dark Banner Header */}
          <div className="bg-[#141414] text-[#faf8f5] px-5 py-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-amber-400 font-bold">
                {step === "success"
                  ? "ORDER CONFIRMED & PAID"
                  : "EXPRESS CHECKOUT & PAYMENT"}
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

          <div className="p-4 sm:p-5">
            {step === "ready" || step === "failed" ? (
              <form onSubmit={handlePayNow} className="space-y-4" noValidate>
                {/* 1. Selected Product & Fit Card */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-black/70">
                      1. YOUR SELECTED SET
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
                                size: selectedSize,
                                quantity: 1
                              }
                            ]);
                            setDiscountPct(0);
                          }}
                          className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border transition-colors ${
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
                                size: selectedSize,
                                quantity: 1
                              },
                              {
                                product: catalog[1],
                                size: selectedSize,
                                quantity: 1
                              }
                            ]);
                            setDiscountPct(15);
                          }}
                          className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border transition-colors ${
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
                      className="flex items-center gap-3 p-3 rounded-2xl bg-[#faf8f5] border border-black/10"
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
                          ✓ Incl. {gstPercent}% GST • + ₹{shippingFee.toLocaleString("en-IN")} Shipping
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-black">
                          ₹{item.product.price.toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Quick Size Switcher Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[9px] font-bold uppercase text-black/55 mr-1">
                      Size:
                    </span>
                    {SIZE_OPTIONS.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => handleSizeChange(sz)}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase border transition-all ${
                          selectedSize === sz
                            ? "bg-[#141414] text-white border-[#141414]"
                            : "bg-white text-black/70 border-black/15 hover:border-black/40"
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-bold">
                      <span>🎁 2-Set Bundle Discount (15% OFF)</span>
                      <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                </div>

                {errorMessage && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2 font-bold"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* 2. Delivery & Contact Form (With Browser Autofill) */}
                <fieldset className="rounded-2xl border border-black/15 bg-neutral-50/70 p-3.5 sm:p-4 space-y-3">
                  <legend className="text-[10px] font-black uppercase tracking-wider text-black/80 px-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-800" />
                    2. DELIVERY &amp; CONTACT DETAILS
                  </legend>

                  {/* Full Name */}
                  <div>
                    <label
                      htmlFor="pay-fullname"
                      className="block text-[10px] font-bold uppercase text-black/75 mb-1"
                    >
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-black/40 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="pay-fullname"
                        type="text"
                        name="name"
                        autoComplete="name"
                        enterKeyHint="next"
                        required
                        placeholder="e.g. Niyas KM"
                        value={customer.fullName}
                        onChange={(e) =>
                          handleFieldChange("fullName", e.target.value)
                        }
                        className={`w-full bg-white border ${
                          fieldErrors.fullName
                            ? "border-red-500"
                            : "border-black/20"
                        } rounded-xl pl-8 pr-3 py-2.5 text-xs sm:text-sm font-bold focus:outline-none focus:border-black`}
                      />
                    </div>
                    {fieldErrors.fullName && (
                      <p className="text-[10px] text-red-600 font-bold mt-1">
                        {fieldErrors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Email & Phone Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="pay-email"
                        className="block text-[10px] font-bold uppercase text-black/75 mb-1"
                      >
                        Email ID (For Receipt &amp; Tracking) *
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-black/40 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="pay-email"
                          type="email"
                          name="email"
                          autoComplete="email"
                          enterKeyHint="next"
                          required
                          placeholder="you@gmail.com"
                          value={customer.email}
                          onChange={(e) =>
                            handleFieldChange("email", e.target.value)
                          }
                          className={`w-full bg-white border ${
                            fieldErrors.email
                              ? "border-red-500"
                              : "border-black/20"
                          } rounded-xl pl-8 pr-3 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-black`}
                        />
                      </div>
                      {fieldErrors.email && (
                        <p className="text-[10px] text-red-600 font-bold mt-1">
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="pay-phone"
                        className="block text-[10px] font-bold uppercase text-black/75 mb-1"
                      >
                        WhatsApp / Mobile Number *
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-black/40 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="pay-phone"
                          type="tel"
                          name="phone"
                          inputMode="tel"
                          autoComplete="tel"
                          enterKeyHint="next"
                          required
                          placeholder="98470 12345"
                          value={customer.phone}
                          onChange={(e) =>
                            handleFieldChange("phone", e.target.value)
                          }
                          className={`w-full bg-white border ${
                            fieldErrors.phone
                              ? "border-red-500"
                              : "border-black/20"
                          } rounded-xl pl-8 pr-3 py-2.5 text-xs sm:text-sm font-bold focus:outline-none focus:border-black`}
                        />
                      </div>
                      {fieldErrors.phone && (
                        <p className="text-[10px] text-red-600 font-bold mt-1">
                          {fieldErrors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* PIN Code & City/State Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor="pay-pincode"
                          className="block text-[10px] font-bold uppercase text-black/75"
                        >
                          6-Digit PIN Code *
                        </label>
                        {pincodeLoading && (
                          <Loader2 className="w-3 h-3 animate-spin text-amber-800" />
                        )}
                      </div>
                      <input
                        id="pay-pincode"
                        type="text"
                        name="postal-code"
                        inputMode="numeric"
                        maxLength={6}
                        autoComplete="postal-code"
                        enterKeyHint="next"
                        required
                        placeholder="683101"
                        value={customer.pincode}
                        onChange={(e) =>
                          handleFieldChange(
                            "pincode",
                            e.target.value.replace(/\D/g, "").slice(0, 6)
                          )
                        }
                        className={`w-full bg-white border ${
                          fieldErrors.pincode
                            ? "border-red-500"
                            : "border-black/20"
                        } rounded-xl px-3 py-2.5 text-xs sm:text-sm font-black tracking-wider focus:outline-none focus:border-black`}
                      />
                      {fieldErrors.pincode && (
                        <p className="text-[10px] text-red-600 font-bold mt-1">
                          {fieldErrors.pincode}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="pay-city"
                        className="block text-[10px] font-bold uppercase text-black/75 mb-1"
                      >
                        City &amp; State *
                      </label>
                      <input
                        id="pay-city"
                        type="text"
                        name="address-level2"
                        autoComplete="address-level2"
                        enterKeyHint="next"
                        required
                        placeholder="Kochi, Kerala"
                        value={customer.city}
                        onChange={(e) =>
                          handleFieldChange("city", e.target.value)
                        }
                        className="w-full bg-white border border-black/20 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-bold focus:outline-none focus:border-black"
                      />
                    </div>
                  </div>

                  {resolvedDeliveryInfo && (
                    <p className="text-[10px] text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{resolvedDeliveryInfo}</span>
                    </p>
                  )}

                  {/* Full Street / House Address */}
                  <div>
                    <label
                      htmlFor="pay-address"
                      className="block text-[10px] font-bold uppercase text-black/75 mb-1"
                    >
                      House / Flat Name, Street &amp; Area *
                    </label>
                    <textarea
                      id="pay-address"
                      name="street-address"
                      rows={2}
                      autoComplete="street-address"
                      required
                      placeholder="e.g. Kizhakkan House, Palace Road, Near Metro Station"
                      value={customer.addressLine1}
                      onChange={(e) =>
                        handleFieldChange("addressLine1", e.target.value)
                      }
                      className={`w-full bg-white border ${
                        fieldErrors.addressLine1
                          ? "border-red-500"
                          : "border-black/20"
                      } rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-black`}
                    />
                    {fieldErrors.addressLine1 && (
                      <p className="text-[10px] text-red-600 font-bold mt-1">
                        {fieldErrors.addressLine1}
                      </p>
                    )}
                  </div>
                </fieldset>

                {/* 3. Itemized Bill & GST Summary Card */}
                <div className="rounded-2xl border border-black/15 bg-white p-3.5 sm:p-4 text-xs space-y-1.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-black/80 border-b border-black/10 pb-1.5 mb-1">
                    3. BILL &amp; GST SUMMARY
                  </div>
                  <div className="flex justify-between text-black/75">
                    <span>Product Rate (Excl. GST):</span>
                    <span className="font-bold text-black">
                      ₹{taxableAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between text-black/75">
                    <span>GST ({gstPercent}% Included in Product Price):</span>
                    <span className="font-bold text-black">
                      ₹{gstAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-800 font-bold">
                      <span>2-Set Bundle Discount ({discountPct}%):</span>
                      <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-black/85 font-bold">
                    <span>Product Total (Incl. {gstPercent}% GST):</span>
                    <span>₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-amber-950 font-bold">
                    <span>
                      Shipping Rate (
                      {customer.pincode.length === 6
                        ? `PIN ${customer.pincode} • ${courierName}`
                        : "Enter 6-digit PIN above"}
                      ):
                    </span>
                    <span className="text-black">
                      + ₹{shippingFee.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-black pt-2 border-t border-black/15">
                    <span>Total Payable (Incl. GST + Shipping):</span>
                    <span>₹{total.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Primary 1-Click Pay Button */}
                <button
                  type="submit"
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
                    100% Secure Razorpay Checkout • Instant WhatsApp &amp; Email
                    Receipt
                  </span>
                </div>
              </form>
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
                  Please do not close this window while we confirm your
                  payment...
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
                    Thank You,{" "}
                    {confirmedOrder?.customer.fullName || customer.fullName}!
                  </h2>
                  <p className="text-xs text-black/70 max-w-sm">
                    Your handcrafted <strong>APOORVA SHELLS</strong> order{" "}
                    <strong>#{confirmedOrder?.orderId || rawOrderId}</strong> is
                    confirmed! We have sent your receipt &amp; tracking link to{" "}
                    <strong>
                      {confirmedOrder?.customer.email || customer.email}
                    </strong>{" "}
                    and your WhatsApp.
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
                      ₹
                      {(
                        confirmedOrder?.pricing.total || total
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/60">Deliver To:</span>
                    <span className="font-bold text-right max-w-[220px] truncate">
                      {confirmedOrder?.customer.addressLine1 ||
                        customer.addressLine1}
                      , {confirmedOrder?.customer.pincode || customer.pincode}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/60">Express Courier:</span>
                    <span className="font-bold">
                      {confirmedOrder?.shipping?.courierName ||
                        "Blue Dart Express (Air)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/60">AWB Tracking #:</span>
                    <span className="font-black text-amber-900">
                      {confirmedOrder?.shipping?.trackingNumber ||
                        "BD-88492019IN"}
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
          Loading APOORVA SHELLS Express Checkout...
        </div>
      }
    >
      <OrderPaymentContent />
    </Suspense>
  );
}
